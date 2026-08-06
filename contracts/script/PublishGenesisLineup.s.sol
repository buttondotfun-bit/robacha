// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IRegistry {
    function createPoolVersion(uint256 poolId, string calldata name) external returns (uint256 version);
    function setEconomics(uint256 poolId, uint256 version, uint256 baseSpinPriceWei, uint256 randomnessSurchargeWei)
        external;
    function setRoundConfig(
        uint256 poolId,
        uint256 version,
        uint16 maxEntriesPerRound,
        uint32 roundDuration,
        uint16 maxQuantityPerTx,
        uint16 maxQuantityPerWallet
    ) external;
    function setProbabilities(uint256 poolId, uint256 version, uint16[] calldata probabilityBps) external;
    function addReward(uint256 poolId, uint256 version, address token, uint8 tierIndex, uint256 min, uint256 max)
        external;
    function activate(uint256 poolId, uint256 version, uint64 startTime, uint64 endTime) external;
    function allowlistedTokens(address token) external view returns (bool);
    function activeVersion(uint256 poolId) external view returns (uint256);
    function activationReadiness(uint256 poolId, uint256 version)
        external
        view
        returns (bool, bool, bool, bool, bool inventorySolvent, address firstUnfundedToken);
}

interface IVault {
    function available(address token) external view returns (uint256);
}

interface IUniswapV2Router02 {
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (uint160 sqrtPriceX96, int24, uint16, uint16, uint16, uint8, bool);
    function token0() external view returns (address);
}

/**
 * @notice Publishes one Genesis Pool version carrying every token that can
 *         actually back a prize, and removes the lifetime per-wallet cap.
 *
 * Supersedes PublishPoolV4, which did the cap alone. There is no reason to
 * spend two versions on two changes, and each activation retires the previous
 * version for everyone mid-play.
 *
 * WHY SLOTS ARE PRICED RATHER THAN HARDCODED
 *
 * v3's prize table was a set of fixed token amounts chosen against the prices
 * of the day, with a note to re-check them if the market moved. It moved. WOOD
 * is now cheap enough that its whole 121 token vault balance is worth about
 * 0.0003 ETH — half a single spin — so the amounts that once made a fair
 * legendary tier now make a derisory one.
 *
 * So each slot is sized here from a live quote: pick a target value in ETH,
 * ask the router how many tokens that buys, and use it. Two things follow.
 * Prizes stay comparable across tokens whose prices have nothing to do with
 * each other, and a token funded after this was written sizes itself correctly
 * without anyone editing a constant.
 *
 * Targets are set against the base spin price, not plucked from the air:
 *
 *     common     70%    0.5x base
 *     rare       25%    1.0x base
 *     legendary   5%    4.0x base
 *
 * which is an expected payout of 0.80x base — inside the 85% the fee router
 * actually reserves for prizes, with room for the spread on restocking.
 *
 * WHICH TOKENS, AND WHY NOT THE OTHERS
 *
 * Every candidate is checked on chain for two things: it is allowlisted, and
 * the vault holds some. Anything failing either is skipped with a line saying
 * so, rather than silently dropped or — worse — added as a slot the vault
 * cannot cover, which makes `activate` revert and leaves the pool on its old
 * version.
 *
 * PONS, FRONG and TENDIES are included, which reverses an earlier call. They
 * were dropped on the grounds that their markets were too thin to back a
 * prize, measured from their V2 pairs — 0.00165, 0.000262 and 0.000000179 ETH.
 * That measurement missed the venue that matters. Their real liquidity is in
 * the Uniswap V4 singleton, which holds 15.7m PONS, 45.0m FRONG and 1.77m
 * TENDIES against 3,583 ETH, and it was never checked because only the V2 and
 * V3 factories were.
 *
 * So the thin V2 pairs were never their market, only the venue we happened to
 * buy through — which is why those purchases filled so badly. The pairs remain
 * usable for *pricing*, since a small quote against a shallow pool still
 * tracks the real price even though a real purchase through it does not.
 *
 * What is still true is that the vault holds very little of each, because the
 * buying went through those pairs. Every slot here is capped at a quarter of
 * inventory, so they enter as small prizes rather than as prizes the vault
 * cannot cover. Buying them properly needs V4 support in the AutoBuyer, which
 * it does not yet have.
 *
 * ORDER MATTERS
 *
 * `setProbabilities` deletes the version's reward slots, because a slot's tier
 * index only means anything against a given tier list. Probabilities are set
 * before any reward is added, never after.
 */
contract PublishGenesisLineup is Script {
    uint256 constant POOL_ID = 1;

    uint256 constant BASE_SPIN_PRICE_WEI = 0.0005 ether;
    /**
     * @dev Sized so a round pays for its own entropy rather than the treasury
     *      doing it.
     *
     *      One round buys one word however many seats it holds, so the cost
     *      divides across everyone in it. Measured occupancy is 3.29 seats
     *      across 69 entries, and StonkPit's fee ceiling plus a keeper tip is
     *      0.0006, so break-even is 0.0006 / 3.29 = 0.000182. At 0.0002 a round
     *      collects 0.000658 — covering the ceiling with room, and the live
     *      quote of 0.0003425 nearly twice over.
     *
     *      The surplus is not profit and cannot become profit: the fee router
     *      sends unused surcharge to `randomnessTreasury`, which points at the
     *      entropy adapter, so busy rounds refill the float that lean ones draw
     *      down. That loop is what stops this needing topping up by hand.
     *
     *      Deliberately not the 0.0006 a single-seat round would need to be
     *      self-sufficient alone. That reading ignores amortisation, and since
     *      the surcharge buys no prizes it would have cut the player's expected
     *      return from 67% to 36% — a house edge worth screenshotting, on a
     *      site that publishes its odds.
     *
     *      Twenty-one rounds is a thin sample. If occupancy settles nearer two
     *      seats, break-even at the ceiling rises to 0.0003; `runwayRounds()`
     *      on the adapter will show that coming before players feel it.
     */
    uint256 constant RANDOMNESS_SURCHARGE_WEI = 0.0002 ether;
    uint16 constant MAX_ENTRIES_PER_ROUND = 5;
    uint32 constant ROUND_DURATION = 120;
    uint16 constant MAX_QUANTITY_PER_TX = 5;

    /// 0 = unlimited. Five-per-round still holds, via MAX_ENTRIES_PER_ROUND.
    uint16 constant MAX_QUANTITY_PER_WALLET = 0;

    address constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address constant V2_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;

    // All four verified on chain: symbol() matches the ticker, 18 decimals.
    address constant CASHCAT = 0x020bfC650A365f8BB26819deAAbF3E21291018b4;
    address constant WOOD = 0xF8BC08092C06dB6148114DCf82AF881F1085f92b;
    address constant PONS = 0x39dBED3a2bd333467115dE45665cC57F813C4571;
    address constant TENDIES = 0x45242320DBB855EeA8Fd36804C6487E10E97FCF9;
    address constant FRONG = 0x6245e67affA44a23077f0Ea7f981a8DC743a0c47;
    address constant ROB = 0x7B7D785a2BA95d39F97FCe44f5B2169895855b7E;
    address constant DICE = 0x3F9f0b6073Ee8c495Aed96869AF31850fED40FeB;
    address constant STONKBROKER = 0xe934e36A439C94017B64a3FecE66AF12099aBF50;
    address constant DERP = 0x6543B7746ca744C4bb2198191E71f40FF04C41b9;
    address constant SUSHI = 0x0bb40D7fbaE7f0C69Bc5910C601987dce697d85F;
    address constant THROBBIN = 0xe8fB470E0685437d7739BD2AacBA60b228800335;

    /// @dev Tier targets as a multiple of the base spin price, in basis points.
    uint256 constant COMMON_BPS = 5_000;
    uint256 constant RARE_BPS = 10_000;
    uint256 constant LEGENDARY_BPS = 40_000;

    /// @dev A prize is a band, not a number: min is 60% of the target.
    uint256 constant MIN_BAND_BPS = 6_000;

    IRegistry registry;
    IVault vault;

    function run() external {
        registry = IRegistry(vm.envAddress("ROBACHA_POOL_REGISTRY"));
        vault = IVault(vm.envAddress("ROBACHA_REWARD_VAULT"));

        console2.log("active version before", registry.activeVersion(POOL_ID));

        address[11] memory candidates =
            [CASHCAT, WOOD, ROB, DICE, PONS, FRONG, TENDIES, STONKBROKER, DERP, SUSHI, THROBBIN];
        string[11] memory names = [
            "CASHCAT", "WOOD", "ROB", "DICE", "PONS", "FRONG", "TENDIES", "STONKBROKER", "DERP", "SUSHI", "THROBBIN"
        ];

        // Decide the whole table before broadcasting anything, so a token that
        // cannot be included is reported rather than discovered halfway through
        // a sequence of live transactions.
        address[] memory usable = new address[](candidates.length);
        uint256 count;
        for (uint256 i = 0; i < candidates.length; ++i) {
            (bool ok, string memory why) = _assess(candidates[i]);
            if (ok) {
                usable[count++] = candidates[i];
                console2.log("including", names[i]);
            } else {
                console2.log("skipping ", names[i], why);
            }
        }
        require(count > 0, "no token can back a prize - fund the vault first");

        vm.startBroadcast();

        uint256 version = registry.createPoolVersion(POOL_ID, "Genesis Pool");
        registry.setEconomics(POOL_ID, version, BASE_SPIN_PRICE_WEI, RANDOMNESS_SURCHARGE_WEI);
        registry.setRoundConfig(
            POOL_ID, version, MAX_ENTRIES_PER_ROUND, ROUND_DURATION, MAX_QUANTITY_PER_TX, MAX_QUANTITY_PER_WALLET
        );

        uint16[] memory probabilities = new uint16[](3);
        probabilities[0] = 7000;
        probabilities[1] = 2500;
        probabilities[2] = 500;
        registry.setProbabilities(POOL_ID, version, probabilities);

        // One token per tier, and no token in two tiers.
        //
        // The obvious arrangement — every token in the common tier, then the
        // deepest market in each of the big ones — put CASHCAT in all three,
        // because "the deepest" answers the same for rare and legendary. The
        // machine then showed three CASHCAT slots and read as though the pool
        // held one coin wearing three hats.
        //
        // So the deepest market takes legendary, the next takes rare, and
        // everything remaining shares the common tier. Depth decides the order
        // because the big tiers are the ones a shallow market cannot restock
        // after paying out once.
        _sortByDepth(usable, count);

        uint256 first = count > 2 ? 2 : 0; // where the common tier starts
        if (count > 1) {
            _addSlot(version, usable[0], 2, LEGENDARY_BPS);
            _addSlot(version, usable[1], 1, RARE_BPS);
        } else {
            // A single token has to carry every tier; there is nothing else.
            _addSlot(version, usable[0], 2, LEGENDARY_BPS);
            _addSlot(version, usable[0], 1, RARE_BPS);
        }
        for (uint256 i = first; i < count; ++i) {
            _addSlot(version, usable[i], 0, COMMON_BPS);
        }

        registry.activate(POOL_ID, version, uint64(block.timestamp), 0);

        vm.stopBroadcast();

        (,,,, bool solvent, address firstUnfunded) = registry.activationReadiness(POOL_ID, version);
        console2.log("published version ", version);
        console2.log("activeVersion(1)  ", registry.activeVersion(POOL_ID));
        console2.log("inventorySolvent  ", solvent);
        console2.log("firstUnfundedToken", firstUnfunded);

        require(registry.activeVersion(POOL_ID) == version, "new version did not become active");
        require(solvent, "vault cannot cover every slot's max");
    }

    /// @dev Allowlisted, held, and quotable. All three or it cannot be a prize.
    function _assess(address token) internal view returns (bool ok, string memory why) {
        if (!registry.allowlistedTokens(token)) return (false, "not allowlisted");
        if (vault.available(token) == 0) return (false, "vault holds none");
        if (_tokensFor(token, BASE_SPIN_PRICE_WEI) == 0) return (false, "no usable quote");
        return (true, "");
    }

    /**
     * @dev Adds one slot, sized from a live quote and clamped to inventory.
     *
     * The clamp is what keeps `activate` from reverting: solvency is checked
     * per slot against `vault.available`, so a max above the balance fails the
     * whole activation. Clamping publishes a smaller prize instead, which is
     * worse than intended but live, and says so in the log.
     */
    function _addSlot(uint256 version, address token, uint8 tier, uint256 targetBps) internal {
        uint256 targetWei = (BASE_SPIN_PRICE_WEI * targetBps) / 10_000;

        // The target is the average prize, not the best one. A slot pays
        // somewhere in [min, max] with min at 60% of max, so the mean lands at
        // 80% of max — treating the target as the max would quietly pay out a
        // fifth less than intended, which across the whole table is the
        // difference between an expected 80% of the spin price and 56%.
        uint256 max = (_tokensFor(token, targetWei) * 20_000) / (10_000 + MIN_BAND_BPS);
        uint256 held = vault.available(token);

        // No single prize may be worth more than a quarter of what backs it.
        // Solvency is only checked at activation, so a slot sized at the whole
        // balance passes that check and then empties the token on its first
        // win, leaving every later draw on it unpayable. A quarter means the
        // pool survives at least four wins on its scarcest token while the
        // reserve restocks.
        uint256 cap = held / 4;
        if (cap == 0) cap = held;
        if (max > cap) {
            console2.log("  UNDERFUNDED - prize capped to a quarter of inventory:", token);
            max = cap;
        }
        uint256 min = (max * MIN_BAND_BPS) / 10_000;
        if (min == 0) min = max;

        registry.addReward(POOL_ID, version, token, tier, min, max);
        console2.log("  slot tier", tier);
        console2.log("    min", min);
        console2.log("    max", max);
    }

    /**
     * @dev How many tokens `ethAmount` buys right now. 0 if unpriceable.
     *
     * A registered V3 pool wins over the V2 pair, rather than the V2 pair
     * being tried first and V3 only catching the revert. That ordering was
     * safe while the V3-only tokens had no V2 pair at all, and stops being
     * safe the moment one does: STONKBROKER's V2 pair exists and holds about
     * 6.5e-12 WETH, so it does not revert — it answers, with a number produced
     * by a pool holding nothing. The slot would have been sized off a price
     * that no real trade could ever get.
     *
     * The pools in `_v3PoolFor` are there because each was checked by hand and
     * found to be the token's actual market. That is better evidence than the
     * mere existence of a pair.
     */
    function _tokensFor(address token, uint256 ethAmount) internal view returns (uint256) {
        if (_v3PoolFor(token) != address(0)) return _v3Price(token, ethAmount);

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = token;
        try IUniswapV2Router02(V2_ROUTER).getAmountsOut(ethAmount, path) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /**
     * @dev Price a token from its V3 pool's spot price.
     *
     * Reading the pool rather than asking a quoter, because the quoter is a
     * separate deployment whose address is not something to guess on a chain
     * where getting it wrong means pricing a prize off a contract that is not
     * what we think it is. The pool address is known and verified.
     *
     * This is spot, so it ignores the price impact a real swap would pay. That
     * is the right trade here: it prices a prize rather than executing a
     * trade, and a prize is denominated in tokens once and paid out later.
     *
     * The multiplication is staged through two shifts rather than squaring
     * sqrtPriceX96 outright, which would overflow uint256 for any realistic
     * price.
     */
    function _v3Price(address token, uint256 ethAmount) internal view returns (uint256) {
        address pool = _v3PoolFor(token);
        if (pool == address(0)) return 0;

        try IUniswapV3Pool(pool).slot0() returns (uint160 sqrtPriceX96, int24, uint16, uint16, uint16, uint8, bool) {
            uint256 sqrtP = uint256(sqrtPriceX96);
            bool wethIsToken0 = IUniswapV3Pool(pool).token0() == WETH;

            if (wethIsToken0) {
                // price = (sqrtP / 2^96)^2 gives token1 per token0.
                uint256 staged = (ethAmount * sqrtP) >> 96;
                return (staged * sqrtP) >> 96;
            } else {
                // Inverted: token0 per token1.
                uint256 staged = (ethAmount << 96) / sqrtP;
                return (staged << 96) / sqrtP;
            }
        } catch {
            return 0;
        }
    }

    /// @dev The verified V3 pool for a token, or zero if it has none.
    function _v3PoolFor(address token) internal pure returns (address) {
        // Both trade only at the 1% tier; the 0.05% and 0.3% tiers were checked
        // on chain and are empty, and neither has a V2 pair to fall back on.
        if (token == ROB) return 0x1490b8cB62e567F862DeC48E4C100e2DBFb10092;
        if (token == DICE) return 0x399eaE9D063Cff3f0b05aa94256348c475001022;
        // STONKBROKER also has a V2 pair, but it holds about 6.5e-12 WETH —
        // empty in every sense that matters. Registering the 1% pool here is
        // what stops that corpse being used to price a prize. Its 0.3% tier
        // exists too and is shallower: 4.5 WETH against 15.9.
        if (token == STONKBROKER) return 0x9cd74d5980A4BF60408B9bA2B0F6a3d368EBf594;
        // DERP has the same shape: no V2 pair at all, a 0.3% tier holding
        // 0.0002 WETH, and everything real in the 1% tier at 14.4 WETH.
        if (token == DERP) return 0xfB578FdD8f3577E8ce7A45dfef725B6072b9d9A1;
        // SUSHI sits on a third V3 factory entirely, 0xE51960f1, which is why
        // scanning only the V2 factory and Gekko's V3 factory missed it. The
        // pool is read directly here, so pricing needs no router — but buying
        // does, and that router speaks the older SwapRouter shape.
        if (token == SUSHI) return 0x7fff70d5748390779E573A1995952c3DdDF57a9c;
        // THROBBIN has no V2 pair at all and nothing on the Sushi factory; its
        // market is the 1% tier on the Gekko V3 factory, holding 12.4 WETH.
        if (token == THROBBIN) return 0xd17044bdbEe55C7bD09c185937C88B9007ab7Be6;
        return address(0);
    }

    /**
     * @dev Orders tokens by what the vault's holding of each is worth,
     *      descending, so index 0 is the deepest.
     *
     * An insertion sort, which would be the wrong choice almost anywhere else
     * and is the right one here: the list is the pool's token count, this runs
     * once off chain, and the alternative is more code to get wrong.
     */
    function _sortByDepth(address[] memory tokens, uint256 count) internal view {
        uint256[] memory values = new uint256[](count);
        for (uint256 i = 0; i < count; ++i) {
            values[i] = _valueOf(tokens[i]);
        }
        for (uint256 i = 1; i < count; ++i) {
            uint256 value = values[i];
            address token = tokens[i];
            uint256 j = i;
            while (j > 0 && values[j - 1] < value) {
                values[j] = values[j - 1];
                tokens[j] = tokens[j - 1];
                --j;
            }
            values[j] = value;
            tokens[j] = token;
        }
    }

    /// @dev What the vault's whole holding of one token is worth, in ETH.
    function _valueOf(address token) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = WETH;
        try IUniswapV2Router02(V2_ROUTER).getAmountsOut(vault.available(token), path) returns (
            uint256[] memory amounts
        ) {
            return amounts[amounts.length - 1];
        } catch {
            // V3-only token: value it through the same spot price used to size
            // its slots, so the ordering stays comparable across venues.
            uint256 perEth = _tokensFor(token, 1e15);
            if (perEth == 0) return 0;
            return (vault.available(token) * 1e15) / perEth;
        }
    }

    /// @dev The token whose vault holding is worth the most, for the big tiers.
    function _deepest(address[] memory tokens, uint256 count) internal view returns (address best) {
        uint256 bestValue;
        for (uint256 i = 0; i < count; ++i) {
            address[] memory path = new address[](2);
            path[0] = tokens[i];
            path[1] = WETH;
            uint256 value;
            try IUniswapV2Router02(V2_ROUTER).getAmountsOut(vault.available(tokens[i]), path) returns (
                uint256[] memory amounts
            ) {
                value = amounts[amounts.length - 1];
            } catch {
                // V3-only token: value it by asking how much ETH's worth of it
                // the vault holds, using the same spot price used to size slots.
                uint256 perEth = _tokensFor(tokens[i], 1e15);
                if (perEth != 0) value = (vault.available(tokens[i]) * 1e15) / perEth;
            }
            if (value > bestValue) {
                bestValue = value;
                best = tokens[i];
            }
        }
        if (best == address(0)) best = tokens[0];
    }
}
