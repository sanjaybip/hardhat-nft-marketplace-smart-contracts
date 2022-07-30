import { ethers, network } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";
import { BasicNft, NftMarketplace } from "../typechain-types";
import { moveBlocks } from "../utils/move-blocks";

const TOKEN_ID = 1;

async function buyItem() {
    let nftMarketplace: NftMarketplace;
    let basicNft: BasicNft;

    nftMarketplace = await ethers.getContract("NftMarketplace");
    basicNft = await ethers.getContract("BasicNft");
    const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
    const price = listing.price.toString();
    const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: price });
    await tx.wait(1);
    console.log("NFT Bought!");
    if (developmentChains.includes(network.name)) {
        // Moralis has a hard time if you move more than 1 at once!
        await moveBlocks(2, 1000);
    }
}

buyItem()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
