// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IMultiConductor {
    function requestFee() external view returns (uint256);
    function request(uint256 nPrints, bytes32 seed) external payable returns (uint256 requestId);
    function cancel(uint256 requestId) external;
    function CANCEL_TIMEOUT() external view returns (uint256);
    function liveTapeCount() external view returns (uint256);
}

/**
 * @title RobachaRaffleHub
 * @notice A permissionless NFT-raffle launchpad. Anyone escrows one of their
 *         Robinhood Chain NFTs, sets the terms, and launches a raffle; the hub
 *         holds the NFT and the ticket money and settles the outcome without
 *         anyone having to trust the platform or the lister.
 *
 * The lifecycle of every raffle is the same, and every branch of it is enforced
 * here rather than promised:
 *
 *   - The creator's NFT is pulled into escrow when the raffle is created. It
 *     cannot leave except to the winner (on a fair sellout) or back to the
 *     creator (on a refund or a cancel with no tickets sold).
 *   - Buyers pay exactly `ticketPriceWei` per ticket, at most `maxPerWallet`
 *     each, up to `ticketCap`. Their money is escrow: it is only ever paid to
 *     the creator after a real draw, or refunded to them in full.
 *   - Sells out → the winner is drawn from StonkPit's mined entropy, the same
 *     source the gacha uses, so neither the platform nor the creator can pick
 *     it. The winner claims the NFT; the creator claims 90% of the take; the
 *     platform keeps 10%.
 *   - Does not sell out, or the draw stalls → every buyer withdraws their money
 *     and the creator reclaims the NFT. No fee is taken on a raffle that did not
 *     sell out.
 *
 * WHAT THE PLATFORM CAN AND CANNOT DO
 *
 * The one privileged lever is `setListingsPaused`, which stops *new* raffles
 * from being created. It cannot touch a raffle that already exists: not its
 * money, not its NFT, not its winner. The platform's only economic role is the
 * 10% fee on a sellout, and a `drawFloat` it funds to pay the conductor for the
 * draw — working capital it recoups from those fees. There is deliberately no
 * seize, no force-cancel, no pick-the-winner. That absence is the product.
 *
 * TWO POOLS OF MONEY, KEPT APART
 *
 * Each raffle's ticket money (`totalEscrow`) is sacred and per-raffle: it is
 * only refunded to that raffle's buyers or split to that raffle's creator and
 * the fee, never lent to a draw or another raffle. The conductor's fee is paid
 * from the hub-wide `drawFloat`, so a draw that is requested and then strands
 * can never leave a raffle's escrow short of what its refunds owe.
 *
 * FAIL-CLOSED
 *
 * If a sold-out raffle's draw does not complete within `DRAW_TIMEOUT` — the
 * conductor is down, the word never arrives, the float was too thin to request,
 * nobody calls `requestDraw` — refunds open anyway, measured from when it sold
 * out. Money and the NFT can always leave to the people they belong to; they
 * can never be stuck waiting on a callback that isn't coming.
 */
contract RobachaRaffleHub is AccessControl, ReentrancyGuard, IERC721Receiver {
    // ------------------------------------------------------------------ config
    /// The platform's cut of a sold-out raffle, in basis points. 1000 = 10%.
    uint256 public constant PLATFORM_FEE_BPS = 1000;
    uint256 private constant BPS = 10_000;

    /// Folded from four certified prints, matching the gacha's entropy request.
    uint256 public constant N_PRINTS = 4;
    /// After a sellout, refunds open if no winner has landed within this.
    uint256 public constant DRAW_TIMEOUT = 2 hours;

    // Bounds on the terms a creator may set. Wide enough to be useful, tight
    // enough that a listing cannot be nonsense (a zero-price raffle, a cap of
    // one, a window that never ends or one already over).
    uint32 public constant MIN_TICKET_CAP = 2;
    uint32 public constant MAX_TICKET_CAP = 10_000;
    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 30 days;
    /// A start may be scheduled at most this far ahead, so an escrowed NFT is
    /// not locked behind a window that opens in a year.
    uint256 public constant MAX_START_LEAD = 14 days;

    IMultiConductor public immutable conductor;

    // -------------------------------------------------------------------- state
    enum State {
        Open, // taking tickets
        AwaitingDraw, // sold out, waiting on the word
        Complete, // winner drawn
        Refundable, // expired unsold, or the draw failed — buyers withdraw
        Cancelled // pulled by the creator before any ticket sold
    }

    struct Raffle {
        address creator;
        address nft;
        uint256 tokenId;
        uint256 ticketPriceWei;
        uint32 ticketCap;
        uint32 maxPerWallet;
        uint64 openAt;
        uint64 closesAt;
        uint32 ticketsSold;
        uint64 soldOutAt;
        address winner;
        uint256 drawRequestId;
        uint64 drawRequestedAt;
        uint256 totalEscrow;
        bool refundsOpen;
        bool cancelled;
        bool proceedsSettled;
        bool nftSettled;
        bool feeReclaimed;
    }

    /// One entry per *buy*, not per ticket: `cumulative` is the running total of
    /// tickets sold through this purchase. The winning ticket index is resolved
    /// against these by binary search, so a wallet's weight is exactly its ticket
    /// count and a raffle of thousands of tickets still costs O(1) to enter.
    struct Segment {
        address buyer;
        uint32 cumulative;
    }

    uint256 public raffleCount;
    mapping(uint256 => Raffle) public raffles;
    mapping(uint256 => Segment[]) private _segments;
    mapping(uint256 => mapping(address => uint32)) public ticketsOf;
    mapping(uint256 => mapping(address => uint256)) public paidWei;
    mapping(uint256 => mapping(address => bool)) public refunded;
    /// conductor requestId → raffle id (ids are 1-based, so 0 means "unknown").
    mapping(uint256 => uint256) public raffleOfRequest;

    /// Operator-funded ETH for conductor fees. Shared across raffles, never
    /// mingled with any raffle's ticket escrow.
    uint256 public drawFloat;
    /// The 10% cuts collected from sold-out raffles, awaiting withdrawal.
    uint256 public platformFees;
    /// When true, no new raffles may be created. Existing raffles are untouched.
    bool public listingsPaused;

    // ------------------------------------------------------------------ events
    event RaffleCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed nft,
        uint256 tokenId,
        uint256 ticketPriceWei,
        uint32 ticketCap,
        uint32 maxPerWallet,
        uint64 openAt,
        uint64 closesAt
    );
    event TicketsBought(uint256 indexed id, address indexed buyer, uint32 quantity, uint32 walletTotal, uint32 ticketsSold);
    event SoldOut(uint256 indexed id, uint256 at);
    event DrawRequested(uint256 indexed id, uint256 requestId, uint256 fee);
    event WinnerDrawn(uint256 indexed id, address indexed winner, uint256 winningTicket, uint256 word);
    event PrizeClaimed(uint256 indexed id, address indexed winner);
    event ProceedsClaimed(uint256 indexed id, address indexed creator, uint256 toCreator, uint256 fee);
    event RefundsOpened(uint256 indexed id, string reason);
    event Refunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event NftReclaimed(uint256 indexed id, address indexed creator);
    event RaffleCancelled(uint256 indexed id);
    event FeeReclaimed(uint256 indexed id, uint256 amount);
    event DrawFloatFunded(uint256 amount);
    event DrawFloatWithdrawn(address indexed to, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);
    event ListingsPausedSet(bool paused);

    // ------------------------------------------------------------------ errors
    error ZeroAddress();
    error BadConfig();
    error ListingsArePaused();
    error UnknownRaffle();
    error NotOpen();
    error QuantityInvalid();
    error WalletCapExceeded(uint32 held, uint32 cap);
    error SoldOutAlready();
    error IncorrectPayment(uint256 expected, uint256 sent);
    error NotSoldOut();
    error AlreadyRequested();
    error DrawFloatTooThin(uint256 have, uint256 need);
    error NotConductor();
    error UnknownRequest();
    error DrawClosed();
    error NotRefundable();
    error NothingToRefund();
    error AlreadyRefunded();
    error NotComplete();
    error AlreadySettled();
    error NotReclaimable();
    error NotCreator();
    error HasSales();
    error NotYetReclaimable();
    error TransferFailed();
    error NftNotEscrowed();

    constructor(address admin, address conductor_) {
        if (admin == address(0) || conductor_ == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        conductor = IMultiConductor(conductor_);
    }

    // --------------------------------------------------------------- create
    /**
     * @notice List an NFT and open a raffle for it. The caller must have
     *         approved the hub for the token first; it is pulled into escrow
     *         here and released only by the outcome.
     * @param nft The ERC-721 contract on this chain.
     * @param tokenId The token to raffle.
     * @param ticketPriceWei Price of one ticket, in wei. Non-zero.
     * @param ticketCap Total tickets. In [MIN_TICKET_CAP, MAX_TICKET_CAP].
     * @param maxPerWallet Most any one wallet may hold. In [1, ticketCap].
     * @param openAt Unix second sales open; 0 means now. At most MAX_START_LEAD ahead.
     * @param duration Seconds the sale runs. In [MIN_DURATION, MAX_DURATION].
     */
    function createRaffle(
        address nft,
        uint256 tokenId,
        uint256 ticketPriceWei,
        uint32 ticketCap,
        uint32 maxPerWallet,
        uint64 openAt,
        uint256 duration
    ) external nonReentrant returns (uint256 id) {
        if (listingsPaused) revert ListingsArePaused();
        if (nft == address(0)) revert ZeroAddress();

        uint64 start = openAt == 0 ? uint64(block.timestamp) : openAt;
        if (
            ticketPriceWei == 0 ||
            ticketCap < MIN_TICKET_CAP ||
            ticketCap > MAX_TICKET_CAP ||
            maxPerWallet == 0 ||
            maxPerWallet > ticketCap ||
            duration < MIN_DURATION ||
            duration > MAX_DURATION ||
            start > block.timestamp + MAX_START_LEAD ||
            uint256(start) + duration <= block.timestamp
        ) revert BadConfig();

        id = ++raffleCount;
        Raffle storage r = raffles[id];
        r.creator = msg.sender;
        r.nft = nft;
        r.tokenId = tokenId;
        r.ticketPriceWei = ticketPriceWei;
        r.ticketCap = ticketCap;
        r.maxPerWallet = maxPerWallet;
        r.openAt = start;
        r.closesAt = uint64(uint256(start) + duration);

        // Effects are written above; the pull is the one external call, and the
        // ownership check makes a lying or no-op transfer fail loudly rather than
        // leave a raffle "live" over an NFT the hub does not actually hold.
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        if (IERC721(nft).ownerOf(tokenId) != address(this)) revert NftNotEscrowed();

        emit RaffleCreated(id, msg.sender, nft, tokenId, ticketPriceWei, ticketCap, maxPerWallet, start, r.closesAt);
    }

    // ------------------------------------------------------------------- views
    /// @notice The whole raffle record in one read, for off-chain consumers.
    function getRaffle(uint256 id) external view returns (Raffle memory) {
        return raffles[id];
    }

    function state(uint256 id) public view returns (State) {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (r.cancelled) return State.Cancelled;
        if (r.winner != address(0)) return State.Complete;
        if (r.refundsOpen) return State.Refundable;
        if (r.ticketsSold == r.ticketCap) return State.AwaitingDraw;
        return State.Open;
    }

    /// @notice Number of distinct purchases in a raffle (for off-chain reads).
    function segmentCount(uint256 id) external view returns (uint256) {
        return _segments[id].length;
    }

    // ------------------------------------------------------------------- buying
    /**
     * @notice Buy `quantity` tickets in raffle `id`. Payment must be exact.
     * @dev No external calls here: filling the last ticket must never depend on
     *      the conductor being reachable, so the draw is a separate step.
     */
    function buyTicket(uint256 id, uint32 quantity) external payable nonReentrant {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (block.timestamp < r.openAt || block.timestamp >= r.closesAt) revert NotOpen();
        if (r.refundsOpen || r.cancelled || r.winner != address(0)) revert NotOpen();
        if (quantity == 0) revert QuantityInvalid();

        uint32 held = ticketsOf[id][msg.sender] + quantity;
        if (held > r.maxPerWallet) revert WalletCapExceeded(held, r.maxPerWallet);

        uint32 sold = r.ticketsSold;
        if (sold + quantity > r.ticketCap) revert SoldOutAlready();

        uint256 cost = uint256(quantity) * r.ticketPriceWei;
        if (msg.value != cost) revert IncorrectPayment(cost, msg.value);

        uint32 newSold = sold + quantity;
        _segments[id].push(Segment({buyer: msg.sender, cumulative: newSold}));
        ticketsOf[id][msg.sender] = held;
        paidWei[id][msg.sender] += msg.value;
        r.totalEscrow += msg.value;
        r.ticketsSold = newSold;

        emit TicketsBought(id, msg.sender, quantity, held, newSold);

        if (newSold == r.ticketCap) {
            r.soldOutAt = uint64(block.timestamp);
            emit SoldOut(id, block.timestamp);
        }
    }

    // --------------------------------------------------------------------- draw
    /**
     * @notice Once a raffle sells out, buy its winning word from the conductor.
     * @dev Permissionless. The fee is paid from the hub's `drawFloat`, never
     *      from ticket money.
     */
    function requestDraw(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (r.ticketsSold != r.ticketCap) revert NotSoldOut();
        if (r.refundsOpen) revert DrawClosed();
        if (r.drawRequestedAt != 0) revert AlreadyRequested();

        uint256 fee = conductor.requestFee();
        if (drawFloat < fee) revert DrawFloatTooThin(drawFloat, fee);
        drawFloat -= fee;

        // Domain-separated so the seed cannot be steered and cannot collide with
        // any other consumer of the same conductor, or another raffle here.
        bytes32 seed = keccak256(abi.encode(block.chainid, address(this), id, r.soldOutAt));
        uint256 requestId = conductor.request{value: fee}(N_PRINTS, seed);

        r.drawRequestId = requestId;
        r.drawRequestedAt = uint64(block.timestamp);
        raffleOfRequest[requestId] = id;
        emit DrawRequested(id, requestId, fee);
    }

    /**
     * @notice The conductor's callback. Picks the winner and finishes the draw.
     * @dev Authenticating the caller is load-bearing: without it anyone could
     *      deliver a word and name a winner. Refuses once refunds have opened,
     *      so a late word cannot crown a winner for a raffle already repaying.
     */
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external nonReentrant {
        if (msg.sender != address(conductor)) revert NotConductor();
        uint256 id = raffleOfRequest[requestId];
        if (id == 0) revert UnknownRequest();

        Raffle storage r = raffles[id];
        if (r.drawRequestId != requestId || r.drawRequestedAt == 0) revert UnknownRequest();
        if (r.refundsOpen || r.winner != address(0)) revert DrawClosed();

        uint256 index = uint256(word) % r.ticketsSold;
        address winner = _winnerAt(id, index);
        r.winner = winner;
        emit WinnerDrawn(id, winner, index, uint256(word));
    }

    /// @dev First purchase whose running total covers ticket index `target`.
    function _winnerAt(uint256 id, uint256 target) internal view returns (address) {
        Segment[] storage segs = _segments[id];
        uint256 lo = 0;
        uint256 hi = segs.length;
        while (lo < hi) {
            uint256 mid = (lo + hi) >> 1;
            if (segs[mid].cumulative <= target) lo = mid + 1;
            else hi = mid;
        }
        return segs[lo].buyer;
    }

    // ------------------------------------------------------------------ payout
    /**
     * @notice Send a winning raffle's NFT to its winner. Permissionless — the
     *         prize goes to the drawn winner regardless of who calls.
     */
    function claimPrize(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.winner == address(0)) revert NotComplete();
        if (r.nftSettled) revert AlreadySettled();

        r.nftSettled = true;
        IERC721(r.nft).safeTransferFrom(address(this), r.winner, r.tokenId);
        emit PrizeClaimed(id, r.winner);
    }

    /**
     * @notice Split a winning raffle's take: 90% to the creator, 10% to the
     *         platform. Permissionless — the money goes to the raffle's creator
     *         regardless of who calls, so a keeper can settle it.
     */
    function claimProceeds(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.winner == address(0)) revert NotComplete();
        if (r.proceedsSettled) revert AlreadySettled();

        r.proceedsSettled = true;
        uint256 gross = r.totalEscrow;
        r.totalEscrow = 0;
        uint256 fee = (gross * PLATFORM_FEE_BPS) / BPS;
        uint256 toCreator = gross - fee;
        platformFees += fee;
        _send(r.creator, toCreator);
        emit ProceedsClaimed(id, r.creator, toCreator, fee);
    }

    // ------------------------------------------------------------------ refunds
    /**
     * @notice Open refunds on a raffle. Permissionless, and the only path to
     *         Refundable. Two triggers, both fail-closed:
     *          - the window elapsed without selling out, or
     *          - it sold out but no winner landed within DRAW_TIMEOUT.
     *         Measured from `soldOutAt`, so a draw nobody requested, or one the
     *         float could not pay for, cannot lock the money forever.
     */
    function markRefundable(uint256 id) external {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (r.refundsOpen || r.cancelled || r.winner != address(0)) revert NotRefundable();

        bool expiredUnsold = block.timestamp >= r.closesAt && r.ticketsSold < r.ticketCap;
        bool drawStalled = r.soldOutAt != 0 && block.timestamp >= uint256(r.soldOutAt) + DRAW_TIMEOUT;
        if (!expiredUnsold && !drawStalled) revert NotRefundable();

        r.refundsOpen = true;
        emit RefundsOpened(id, expiredUnsold ? "window elapsed without selling out" : "draw did not complete in time");
    }

    /// @notice Withdraw everything the caller paid into raffle `id`. Once, while refundable.
    function withdrawRefund(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (!r.refundsOpen) revert NotRefundable();
        if (refunded[id][msg.sender]) revert AlreadyRefunded();

        uint256 amount = paidWei[id][msg.sender];
        if (amount == 0) revert NothingToRefund();

        refunded[id][msg.sender] = true;
        r.totalEscrow -= amount;
        _send(msg.sender, amount);
        emit Refunded(id, msg.sender, amount);
    }

    /**
     * @notice Return the NFT to its creator once a raffle has failed — refunds
     *         open, or the creator cancelled. Permissionless; goes to the creator.
     */
    function reclaimNft(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (!r.refundsOpen && !r.cancelled) revert NotReclaimable();
        if (r.nftSettled) revert AlreadySettled();

        r.nftSettled = true;
        IERC721(r.nft).safeTransferFrom(address(this), r.creator, r.tokenId);
        emit NftReclaimed(id, r.creator);
    }

    /**
     * @notice Cancel a raffle that has sold no tickets and take the NFT back.
     *         Creator only. Once a single ticket is sold the raffle must run to
     *         a draw or a refund — the creator can never pull the rug on buyers.
     */
    function cancelRaffle(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.creator == address(0)) revert UnknownRaffle();
        if (msg.sender != r.creator) revert NotCreator();
        if (r.ticketsSold != 0) revert HasSales();
        if (r.cancelled || r.refundsOpen || r.winner != address(0)) revert NotReclaimable();

        r.cancelled = true;
        r.nftSettled = true;
        IERC721(r.nft).safeTransferFrom(address(this), r.creator, r.tokenId);
        emit RaffleCancelled(id);
    }

    // -------------------------------------------------------------- draw float
    /// @notice Fund the shared conductor-fee pool. Platform only.
    function fundDrawFloat() external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        drawFloat += msg.value;
        emit DrawFloatFunded(msg.value);
    }

    /**
     * @notice Recover a fee from a raffle's draw request the conductor never
     *         determined, crediting it back to the float. Permissionless; the
     *         conductor enforces the real preconditions.
     */
    function reclaimStrandedFee(uint256 id) external nonReentrant {
        Raffle storage r = raffles[id];
        if (r.drawRequestedAt == 0 || r.winner != address(0)) revert NotYetReclaimable();
        if (r.feeReclaimed) revert AlreadySettled();

        r.feeReclaimed = true;
        uint256 before = address(this).balance;
        conductor.cancel(r.drawRequestId);
        uint256 recovered = address(this).balance - before;
        drawFloat += recovered;
        emit FeeReclaimed(id, recovered);
    }

    /// @notice Withdraw uncommitted draw-float ETH. Platform only.
    function withdrawDrawFloat(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount > drawFloat) revert DrawFloatTooThin(drawFloat, amount);
        drawFloat -= amount;
        _send(to, amount);
        emit DrawFloatWithdrawn(to, amount);
    }

    /// @notice Withdraw accrued platform fees. Platform only.
    function withdrawPlatformFees(address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = platformFees;
        platformFees = 0;
        _send(to, amount);
        emit PlatformFeesWithdrawn(to, amount);
    }

    /// @notice Stop (or resume) creation of new raffles. Existing ones untouched.
    function setListingsPaused(bool paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        listingsPaused = paused;
        emit ListingsPausedSet(paused);
    }

    // --------------------------------------------------------------- receivers
    /// @notice Accept NFTs sent via safeTransfer (e.g. our own settle paths).
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Accepts only the conductor's fee refund on `cancel`.
     * @dev Restricted on purpose: ticket money enters through `buyTicket` and
     *      float through `fundDrawFloat`, both of which account for what they
     *      take. Nothing else should be sending this contract bare ETH.
     */
    receive() external payable {
        if (msg.sender != address(conductor)) revert NotConductor();
    }

    // ------------------------------------------------------------------ intern
    function _send(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
