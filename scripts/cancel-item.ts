import { ethers, network } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";
import { BasicNft, NftMarketplace } from "../typechain-types";
import { moveBlocks } from "../utils/move-blocks";

const TOKEN_ID = 0; //for testing, check moralis db
async function cancelListing() {
    let nftMarketplace: NftMarketplace;
    let basicNft: BasicNft;

    nftMarketplace = await ethers.getContract("NftMarketplace");
    basicNft = await ethers.getContract("BasicNft");
    const tx = await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID);
    await tx.wait(1);
    console.log("NFT Canceled!");
    if (developmentChains.includes(network.name)) {
        // Moralis has a hard time if you move more than 1 at once!
        await moveBlocks(2, 1000);
    }
}

cancelListing()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
