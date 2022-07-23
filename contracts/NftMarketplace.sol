// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error PriceMustBeAboveZero();
error NftNotApprovedForMarketplace();
error NftAlreadyListed(address nftAddress, uint256 tokenId);
error NftNotListed(address nftAddress, uint256 tokenId);
error NotNftOwner();
error PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NoNFTSold();

contract NftMarketplace is ReentrancyGuard {
    //Type declartion
    struct Listing {
        uint256 price;
        address seller;
    }

    //Contract Variables
    //NFT Contract address -> tokenId -> listing (Since we need price and seller info, we are using custom Type `Listing`)
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // NFT seller address -> Amount earned selling NFT
    mapping(address => uint256) private s_sellerMoney;

    // Events
    event ItemListed(
        address indexed seller,
        address indexed marketplaceAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed buyer,
        address indexed marketplaceAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ListingCancelled(
        address indexed marketplaceAddress,
        uint256 indexed tokenId,
        address seller
    );
    event ItemUpdated(
        address indexed seller,
        address indexed marketplaceAddress,
        uint256 indexed tokenId,
        uint256 newPrice
    );

    ////////////////
    // Modifiers //
    //////////////
    modifier notListed(address nftContractAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftContractAddress][tokenId];
        if (listing.price > 0) {
            revert NftAlreadyListed(nftContractAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftContractAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftContractAddress][tokenId];
        if (listing.price <= 0) {
            revert NftNotListed(nftContractAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftContractAddress,
        uint256 tokenId,
        address sender
    ) {
        IERC721 nft = IERC721(nftContractAddress);
        address owner = nft.ownerOf(tokenId);
        if (owner != sender) {
            revert NotNftOwner();
        }
        _;
    }

    /////////////////////
    // Main Functions //
    ///////////////////

    /*
     * @notice Method for listing NFT
     * @param nftContractAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param price sale price for each item
     */
    function listItem(
        address nftContractAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftContractAddress, tokenId)
        isOwner(nftContractAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert PriceMustBeAboveZero();
        }
        //Listing can be done in 2 ways
        // 1. Send the NFT to the contract, doing transfer (contract holds NFT) - This could be gas expensive
        // 2. Owners can hold their NFT and give the marketplace approval to sell the NFT for them. (We will use this method).
        IERC721 nft = IERC721(nftContractAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftNotApprovedForMarketplace();
        }
        s_listings[nftContractAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftContractAddress, tokenId, price);
    }

    /*
     * @notice Method for buying listing
     * @notice The owner of an NFT could unapprove the marketplace,
     * which would cause this function to fail
     * Ideally you'd also have a `createOffer` functionality.
     * @param nftContractAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function buyItem(address nftContractAddress, uint256 tokenId)
        external
        payable
        nonReentrant
        isListed(nftContractAddress, tokenId)
    {
        Listing memory listedItem = s_listings[nftContractAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert PriceNotMet(nftContractAddress, tokenId, listedItem.price);
        }

        // instead of sending money to Seller, we want them to withdraw
        // https://fravoll.github.io/solidity-patterns/pull_over_push.html - read more about it
        s_sellerMoney[listedItem.seller] += msg.value;

        delete (s_listings[nftContractAddress][tokenId]); //delete listing from market
        IERC721(nftContractAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftContractAddress, tokenId, msg.value);
    }

    /*
     * @notice Method for cancelling listing
     * @param nftContractAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function cancelListing(address nftContractAddress, uint256 tokenId)
        external
        isOwner(nftContractAddress, tokenId, msg.sender)
        isListed(nftContractAddress, tokenId)
    {
        delete (s_listings[nftContractAddress][tokenId]);
        emit ListingCancelled(nftContractAddress, tokenId, msg.sender);
    }

    /*
     * @notice Method for updating listing
     * @param nftContractAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param newPrice Price in Wei of the item
     */
    function updateListing(
        address nftContractAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        isListed(nftContractAddress, tokenId)
        isOwner(nftContractAddress, tokenId, msg.sender)
    {
        s_listings[nftContractAddress][tokenId].price = newPrice;
        emit ItemUpdated(msg.sender, nftContractAddress, tokenId, newPrice);
    }

    /*
     * @notice Method for withdrawing proceeds from sales
     */

    function withdrawSellerMoney() external {
        uint256 amount = s_sellerMoney[msg.sender];
        if (amount <= 0) {
            revert NoNFTSold();
        }
        s_sellerMoney[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer Failed!");
    }

    ///////////////////////
    // Getter Functions //
    /////////////////////
    function getListing(address nftContractAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftContractAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_sellerMoney[seller];
    }
}
