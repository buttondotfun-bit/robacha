// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMultiConductor {
    function requestFee() external view returns (uint256);
    function request(uint256 nPrints, bytes32 seed) external payable returns (uint256 requestId);
    function cancel(uint256 requestId) external;
    function CANCEL_TIMEOUT() external view returns (uint256);
    function liveTapeCount() external view returns (uint256);
}

/**
 * @title RobachaRaffle
 * @notice A single, fixed-supply raffle that holds the money, draws the winner
 *         provably, and refunds itself if it does not sell out — so nothing
 *         about it rests on trusting the operator.
 *
 * The rules are on chain and immutable once deployed:
 *
 *   - `TICKET_CAP` tickets, at most `MAX_PER_WALLET` to any one wallet.
 *   - A 24-hour window from `openAt`.
 *   - Sells out → the winner is drawn from StonkPit's mined entropy, the same
 *     source the gacha uses, so the operator cannot pick it.
 *   - Does not sell out → every buyer withdraws their own money back,
 *     permissionlessly. The operator can never claim proceeds unless a fair
 *     draw actually happened.
 *
 * The one thing this contract cannot do is hand over the prize: the Meebit is
 * an Ethereum NFT and this runs on Robinhood Chain, so the operator delivers it
 * to the on-chain winner by hand. What the contract guarantees is *who* won and
 * that the money was only ever released after a real draw — the parts that
 * would otherwise require trust.
 *
 * TWO ACCOUNTS, KEPT APART
 *
 * Ticket money (`totalEscrow`) is sacred: it is either paid to the winner-draw
 * outcome (proceeds to the operator) or refunded in full, and nothing else ever
 * touches it. The conductor's fee for the draw is paid from a separate
 * `drawFloat` the operator funds, precisely so that a draw which is requested
 * and then strands cannot leave escrow a few hundred microether short of what
 * refunds owe. That short-by-the-fee bug is the classic way an escrow like this
 * quietly becomes unable to repay its last claimant.
 *
 * FAIL-CLOSED
 *
 * If the draw does not complete within `DRAW_TIMEOUT` of selling out — the
 * conductor is down, the word never arrives, nobody calls `requestDraw` —
 * refunds open anyway. Money can always leave this contract to the people who
 * put it in; it can never be stuck waiting on a randomness callback that isn't
 * coming.
 */
contract RobachaRaffle is AccessControl, ReentrancyGuard {
    // ------------------------------------------------------------------ config
    uint16 public constant TICKET_CAP = 200;
    uint16 public constant MAX_PER_WALLET = 25;
    uint256 public constant WINDOW = 24 hours;
    /// Folded from four certified prints, matching the gacha's entropy request.
    uint256 public constant N_PRINTS = 4;
    /// After a sellout, refunds open if no winner has landed within this.
    uint256 public constant DRAW_TIMEOUT = 2 hours;

    uint256 public immutable ticketPriceWei;
    uint256 public immutable openAt;
    uint256 public immutable closesAt;
    IMultiConductor public immutable conductor;

    // ---------------------------------------------------------------- ticketing
    /// One entry per ticket, so a wallet that buys three appears three times —
    /// which is exactly the weight its odds should carry in the draw.
    address[] public ticketOwners;
    mapping(address => uint16) public ticketsOf;
    mapping(address => uint256) public paidWei;
    mapping(address => bool) public refunded;

    /// Ticket money only. Never spent on the draw; only ever refunded or paid out.
    uint256 public totalEscrow;
    /// Operator-funded ETH for the conductor fee. Never mingled with escrow.
    uint256 public drawFloat;

    uint64 public soldOutAt;

    // -------------------------------------------------------------------- draw
    uint256 public drawRequestId;
    uint64 public drawRequestedAt;
    bool public feeReclaimed;

    address public winner;
    uint256 public winningWord;

    /// Set once, the moment refunds are opened. One-way: a contract in refund is
    /// never later completed, and a completed one never opens refunds.
    bool public refundsOpen;
    bool public proceedsClaimed;

    enum State {
        Open, // taking tickets
        AwaitingDraw, // sold out, waiting on the word
        Complete, // winner drawn
        Refundable // expired unsold, or the draw failed — buyers withdraw
    }

    // ------------------------------------------------------------------ events
    event TicketsBought(address indexed buyer, uint16 quantity, uint16 walletTotal, uint256 ticketsSold);
    event SoldOut(uint256 at);
    event DrawRequested(uint256 requestId, uint256 fee);
    event WinnerDrawn(address indexed winner, uint256 winningTicket, uint256 word);
    event RefundsOpened(string reason);
    event Refunded(address indexed buyer, uint256 amount);
    event ProceedsClaimed(address indexed to, uint256 amount);
    event DrawFloatFunded(uint256 amount);
    event DrawFloatWithdrawn(address indexed to, uint256 amount);
    event FeeReclaimed(uint256 amount);

    // ------------------------------------------------------------------ errors
    error ZeroAddress();
    error BadConfig();
    error NotOpen();
    error QuantityInvalid();
    error WalletCapExceeded(uint16 held, uint16 cap);
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
    error AlreadyClaimed();
    error NotYetReclaimable();
    error NotFinished();
    error TransferFailed();

    constructor(address admin, address conductor_, uint256 ticketPriceWei_, uint256 openAt_) {
        if (admin == address(0) || conductor_ == address(0)) revert ZeroAddress();
        // Reject only a window that is already over — "open now" is a valid
        // input, and pinning openAt to block.timestamp in a script means the tx
        // mines a second or two later, which a strict `openAt < now` would
        // wrongly reject. The real nonsense to prevent is deploying a raffle
        // whose 24 hours have already elapsed.
        if (ticketPriceWei_ == 0 || openAt_ + WINDOW <= block.timestamp) revert BadConfig();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        conductor = IMultiConductor(conductor_);
        ticketPriceWei = ticketPriceWei_;
        openAt = openAt_;
        closesAt = openAt_ + WINDOW;
    }

    // ------------------------------------------------------------------- views
    function state() public view returns (State) {
        if (winner != address(0)) return State.Complete;
        if (refundsOpen) return State.Refundable;
        if (ticketOwners.length == TICKET_CAP) return State.AwaitingDraw;
        return State.Open;
    }

    function ticketsSold() external view returns (uint256) {
        return ticketOwners.length;
    }

    // ------------------------------------------------------------------- buying
    /**
     * @notice Buy `quantity` tickets. Payment must be exact.
     * @dev No external calls here on purpose: filling the last ticket must never
     *      depend on the conductor being reachable, so the draw is a separate,
     *      permissionless step rather than something wedged into this path.
     */
    function buyTicket(uint16 quantity) external payable nonReentrant {
        if (block.timestamp < openAt || block.timestamp >= closesAt) revert NotOpen();
        if (refundsOpen || winner != address(0)) revert NotOpen();
        if (quantity == 0) revert QuantityInvalid();

        uint16 held = ticketsOf[msg.sender] + quantity;
        if (held > MAX_PER_WALLET) revert WalletCapExceeded(held, MAX_PER_WALLET);

        uint256 sold = ticketOwners.length;
        if (sold + quantity > TICKET_CAP) revert SoldOutAlready();

        uint256 cost = uint256(quantity) * ticketPriceWei;
        if (msg.value != cost) revert IncorrectPayment(cost, msg.value);

        for (uint16 i = 0; i < quantity; ++i) {
            ticketOwners.push(msg.sender);
        }
        ticketsOf[msg.sender] = held;
        paidWei[msg.sender] += msg.value;
        totalEscrow += msg.value;

        uint256 newSold = sold + quantity;
        emit TicketsBought(msg.sender, quantity, held, newSold);

        if (newSold == TICKET_CAP) {
            soldOutAt = uint64(block.timestamp);
            emit SoldOut(block.timestamp);
        }
    }

    // --------------------------------------------------------------------- draw
    /**
     * @notice Once sold out, buy the winning word from the conductor.
     * @dev Permissionless — the keeper calls it, but so can anyone, so the draw
     *      can never be held hostage by the operator sitting on it. The fee is
     *      paid from `drawFloat`, never from ticket money.
     */
    function requestDraw() external nonReentrant {
        if (ticketOwners.length != TICKET_CAP) revert NotSoldOut();
        if (refundsOpen) revert DrawClosed();
        if (drawRequestedAt != 0) revert AlreadyRequested();

        uint256 fee = conductor.requestFee();
        if (drawFloat < fee) revert DrawFloatTooThin(drawFloat, fee);
        drawFloat -= fee;

        // Domain-separated so the seed cannot be steered and cannot collide with
        // any other consumer of the same conductor.
        bytes32 seed = keccak256(abi.encode(block.chainid, address(this), soldOutAt));
        uint256 requestId = conductor.request{value: fee}(N_PRINTS, seed);

        drawRequestId = requestId;
        drawRequestedAt = uint64(block.timestamp);
        emit DrawRequested(requestId, fee);
    }

    /**
     * @notice The conductor's callback. Picks the winner and finishes.
     * @dev Authenticating the caller is the load-bearing line: without it anyone
     *      could deliver a word of their choosing and name the winner. Refuses
     *      to run if refunds have already opened, so a late word cannot create a
     *      winner for a raffle that has already begun repaying.
     */
    function rawFulfillEntropy(uint256 requestId, bytes32 word) external nonReentrant {
        if (msg.sender != address(conductor)) revert NotConductor();
        if (requestId != drawRequestId || drawRequestedAt == 0) revert UnknownRequest();
        if (refundsOpen || winner != address(0)) revert DrawClosed();

        uint256 index = uint256(word) % ticketOwners.length;
        winner = ticketOwners[index];
        winningWord = uint256(word);
        emit WinnerDrawn(winner, index, uint256(word));
    }

    // ------------------------------------------------------------------ refunds
    /**
     * @notice Open refunds. Permissionless, and the only path to Refundable.
     * @dev Two triggers, both fail-closed:
     *      - the window elapsed without selling out, or
     *      - it sold out but no winner landed within DRAW_TIMEOUT, whether
     *        because `requestDraw` was never called or the word never came.
     *      Measured from `soldOutAt`, not from the request, so a draw nobody
     *      requested cannot lock the money forever.
     */
    function markRefundable() external {
        if (refundsOpen || winner != address(0)) revert NotRefundable();

        bool expiredUnsold = block.timestamp >= closesAt && ticketOwners.length < TICKET_CAP;
        bool drawStalled = soldOutAt != 0 && block.timestamp >= uint256(soldOutAt) + DRAW_TIMEOUT;

        if (!expiredUnsold && !drawStalled) revert NotRefundable();

        refundsOpen = true;
        emit RefundsOpened(expiredUnsold ? "window elapsed without selling out" : "draw did not complete in time");
    }

    /// @notice Withdraw everything the caller paid. Once, while refundable.
    function withdrawRefund() external nonReentrant {
        if (!refundsOpen) revert NotRefundable();
        if (refunded[msg.sender]) revert AlreadyRefunded();

        uint256 amount = paidWei[msg.sender];
        if (amount == 0) revert NothingToRefund();

        refunded[msg.sender] = true;
        totalEscrow -= amount;
        _send(msg.sender, amount);
        emit Refunded(msg.sender, amount);
    }

    // ------------------------------------------------------------------ payout
    /**
     * @notice Send the ticket proceeds to `to`. Admin, and only once a winner
     *         has been drawn — so the operator's money is unreachable until a
     *         fair draw has actually happened.
     */
    function claimProceeds(address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (winner == address(0)) revert NotComplete();
        if (proceedsClaimed) revert AlreadyClaimed();

        proceedsClaimed = true;
        uint256 amount = totalEscrow;
        totalEscrow = 0;
        _send(to, amount);
        emit ProceedsClaimed(to, amount);
    }

    // -------------------------------------------------------------- draw float
    /// @notice Fund the conductor fee. Kept apart from ticket money by design.
    function fundDraw() external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        drawFloat += msg.value;
        emit DrawFloatFunded(msg.value);
    }

    /**
     * @notice Recover a fee from a draw request the conductor never determined.
     * @dev Permissionless. Only reaches ticket money never — it credits the
     *      recovered fee back to `drawFloat`. The conductor enforces the real
     *      preconditions (undetermined, past its own timeout); this just refuses
     *      to double-count.
     */
    function reclaimStrandedFee() external nonReentrant {
        if (drawRequestedAt == 0 || winner != address(0)) revert NotYetReclaimable();
        if (feeReclaimed) revert AlreadyClaimed();

        feeReclaimed = true;
        uint256 before = address(this).balance;
        conductor.cancel(drawRequestId);
        uint256 recovered = address(this).balance - before;
        drawFloat += recovered;
        emit FeeReclaimed(recovered);
    }

    /// @notice Recover the unused draw float once the raffle is finished.
    function withdrawDrawFloat(address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        // Only when nothing more can happen to it: a winner exists, or refunds
        // are open. Mid-raffle the float must stay put to pay for the draw.
        if (winner == address(0) && !refundsOpen) revert NotFinished();

        uint256 amount = drawFloat;
        drawFloat = 0;
        _send(to, amount);
        emit DrawFloatWithdrawn(to, amount);
    }

    /**
     * @notice Accepts only the conductor's fee refund on `cancel`.
     * @dev Restricted on purpose. The reclaim path needs this contract to be
     *      able to receive the cancelled fee back, but nothing else should be
     *      sending it bare ETH — tickets go through `buyTicket` and the float
     *      through `fundDraw`, both of which account for what they take.
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
