// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RobachaRewardVault} from "./RobachaRewardVault.sol";
import {RobachaRoles} from "./RobachaRoles.sol";

/**
 * @title RobachaSponsorRegistry
 * @notice Accounting for sponsored reward campaigns: who supplied which
 *         inventory, how much of it has been distributed, and what is left.
 *
 * @dev A sponsor deposits real ERC-20 inventory into the reward vault through
 *      this contract, so the deposit is recorded against their campaign rather
 *      than merging anonymously into the vault's balance.
 *
 *      What a sponsor can never do:
 *        - change a pool's probabilities, amounts or result
 *        - withdraw inventory that has already been reserved for a user
 *        - influence a round that is open or awaiting randomness
 *
 *      Withdrawal is limited to `remaining` — deposited minus distributed minus
 *      what the vault currently has reserved — and is only possible once the
 *      campaign has been closed by a pool manager.
 *
 *      The campaign fee is configurable and defaults to zero, i.e. disabled. No
 *      price is assumed here; the operator sets one deliberately or not at all.
 */
contract RobachaSponsorRegistry is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Ceiling on the campaign fee, so it can never be set punitively.
    uint16 public constant MAX_CAMPAIGN_FEE_BPS = 1_000;

    struct Campaign {
        uint256 campaignId;
        address sponsor;
        address token;
        uint256 poolId;
        uint256 version;
        uint256 deposited;
        uint256 distributed;
        uint256 withdrawn;
        uint256 campaignFeePaid;
        uint64 createdAt;
        bool closed;
    }

    RobachaRewardVault public immutable vault;

    /// @notice Where campaign fees are sent. Zero while fees are disabled.
    address public campaignFeeRecipient;

    /// @notice Campaign fee in basis points of the deposit. Zero = disabled.
    uint16 public campaignFeeBps;

    uint256 public nextCampaignId = 1;
    mapping(uint256 campaignId => Campaign) private _campaigns;
    mapping(address sponsor => uint256[] campaignIds) private _campaignsOfSponsor;

    event SponsorRegistered(uint256 indexed campaignId, address indexed sponsor, address indexed token, uint256 poolId);
    event CampaignFunded(uint256 indexed campaignId, uint256 amount, uint256 feePaid);
    event CampaignDistributionRecorded(uint256 indexed campaignId, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId);
    event CampaignWithdrawn(uint256 indexed campaignId, address indexed to, uint256 amount);
    event CampaignFeeUpdated(uint16 feeBps, address recipient);

    error ZeroAddress();
    error ZeroAmount();
    error UnknownCampaign(uint256 campaignId);
    error NotSponsor(uint256 campaignId);
    error CampaignAlreadyClosed(uint256 campaignId);
    error CampaignNotClosed(uint256 campaignId);
    error FeeTooHigh(uint16 bps);
    error FeeRecipientRequired();
    error NonStandardTransfer(address token, uint256 expected, uint256 received);
    error TokenMetadataUnreadable(address token);
    error NothingWithdrawable(uint256 campaignId);
    error InsufficientUnreserved(address token, uint256 requested, uint256 available);

    constructor(address admin, RobachaRewardVault vault_) {
        if (admin == address(0) || address(vault_) == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RobachaRoles.POOL_MANAGER_ROLE, admin);
        vault = vault_;
    }

    // ------------------------------------------------------------------
    // Configuration
    // ------------------------------------------------------------------

    function setCampaignFee(uint16 feeBps, address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps > MAX_CAMPAIGN_FEE_BPS) revert FeeTooHigh(feeBps);
        if (feeBps != 0 && recipient == address(0)) revert FeeRecipientRequired();
        campaignFeeBps = feeBps;
        campaignFeeRecipient = recipient;
        emit CampaignFeeUpdated(feeBps, recipient);
    }

    // ------------------------------------------------------------------
    // Campaigns
    // ------------------------------------------------------------------

    /**
     * @notice Register a campaign against a pool version.
     * @dev Registration is a pool-manager action: a sponsor cannot attach
     *      inventory to a pool the operator has not agreed to.
     */
    function registerCampaign(address sponsor, address token, uint256 poolId, uint256 version)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
        returns (uint256 campaignId)
    {
        if (sponsor == address(0) || token == address(0)) revert ZeroAddress();
        try IERC20Metadata(token).decimals() returns (uint8) {}
        catch {
            revert TokenMetadataUnreadable(token);
        }

        campaignId = nextCampaignId++;
        _campaigns[campaignId] = Campaign({
            campaignId: campaignId,
            sponsor: sponsor,
            token: token,
            poolId: poolId,
            version: version,
            deposited: 0,
            distributed: 0,
            withdrawn: 0,
            campaignFeePaid: 0,
            createdAt: uint64(block.timestamp),
            closed: false
        });
        _campaignsOfSponsor[sponsor].push(campaignId);

        emit SponsorRegistered(campaignId, sponsor, token, poolId);
    }

    /**
     * @notice Deposit reward inventory for a campaign.
     * @dev The sponsor approves this contract, which forwards the net amount to
     *      the vault. Fee-on-transfer tokens are rejected on both hops, so the
     *      amount credited is exactly the amount the vault can pay out.
     */
    function fundCampaign(uint256 campaignId, uint256 amount) external nonReentrant {
        Campaign storage campaign = _requireCampaign(campaignId);
        if (msg.sender != campaign.sponsor) revert NotSponsor(campaignId);
        if (campaign.closed) revert CampaignAlreadyClosed(campaignId);
        if (amount == 0) revert ZeroAmount();

        IERC20 token = IERC20(campaign.token);
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - before;
        if (received != amount) revert NonStandardTransfer(campaign.token, amount, received);

        uint256 fee = campaignFeeBps == 0 ? 0 : (received * campaignFeeBps) / BPS_DENOMINATOR;
        uint256 net = received - fee;

        if (fee != 0) {
            token.safeTransfer(campaignFeeRecipient, fee);
            campaign.campaignFeePaid += fee;
        }

        token.forceApprove(address(vault), net);
        vault.fund(campaign.token, net);

        campaign.deposited += net;

        emit CampaignFunded(campaignId, net, fee);
    }

    /**
     * @notice Record that some of a campaign's inventory has been paid out.
     * @dev Reporting only — it does not move tokens. The vault remains the
     *      authority on balances; this exists so a sponsor's dashboard reflects
     *      distribution without re-deriving it from every claim event.
     */
    function recordDistribution(uint256 campaignId, uint256 amount)
        external
        onlyRole(RobachaRoles.POOL_MANAGER_ROLE)
    {
        Campaign storage campaign = _requireCampaign(campaignId);
        campaign.distributed += amount;
        emit CampaignDistributionRecorded(campaignId, amount);
    }

    function closeCampaign(uint256 campaignId) external onlyRole(RobachaRoles.POOL_MANAGER_ROLE) {
        Campaign storage campaign = _requireCampaign(campaignId);
        if (campaign.closed) revert CampaignAlreadyClosed(campaignId);
        campaign.closed = true;
        emit CampaignClosed(campaignId);
    }

    /**
     * @notice Return a closed campaign's unused inventory to its sponsor.
     * @dev Bounded twice over: by the campaign's own remaining figure, and by
     *      what the vault reports as genuinely unreserved. Inventory already
     *      promised to a user can never be withdrawn.
     */
    function withdrawRemaining(uint256 campaignId, address to)
        external
        nonReentrant
        onlyRole(RobachaRoles.VAULT_MANAGER_ROLE)
    {
        Campaign storage campaign = _requireCampaign(campaignId);
        if (!campaign.closed) revert CampaignNotClosed(campaignId);
        if (to == address(0)) revert ZeroAddress();

        uint256 remaining = _remaining(campaign);
        if (remaining == 0) revert NothingWithdrawable(campaignId);

        uint256 free = vault.available(campaign.token);
        if (free < remaining) revert InsufficientUnreserved(campaign.token, remaining, free);

        campaign.withdrawn += remaining;
        vault.withdrawSurplus(campaign.token, to, remaining);

        emit CampaignWithdrawn(campaignId, to, remaining);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return _campaigns[campaignId];
    }

    function campaignsOf(address sponsor) external view returns (uint256[] memory) {
        return _campaignsOfSponsor[sponsor];
    }

    /// @notice Deposited minus distributed minus already withdrawn.
    function remaining(uint256 campaignId) external view returns (uint256) {
        return _remaining(_campaigns[campaignId]);
    }

    function _remaining(Campaign storage campaign) internal view returns (uint256) {
        uint256 spent = campaign.distributed + campaign.withdrawn;
        return campaign.deposited > spent ? campaign.deposited - spent : 0;
    }

    function _requireCampaign(uint256 campaignId) internal view returns (Campaign storage campaign) {
        campaign = _campaigns[campaignId];
        if (campaign.campaignId == 0) revert UnknownCampaign(campaignId);
    }
}
