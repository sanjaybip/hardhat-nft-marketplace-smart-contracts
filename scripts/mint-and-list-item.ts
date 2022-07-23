import { ethers } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";
import { BasicNft, NftMarketplace } from "../typechain-types";
const PRICE = ethers.utils.parseEther("0.1");
async function mintAndList() {
    let nftMarketplace: NftMarketplace;
    let basicNft: BasicNft;

    nftMarketplace = await ethers.getContract("NftMarketplace");
    basicNft = await ethers.getContract("BasicNft");
    console.log(`Miniting NFT....`);
    const mintTx = await basicNft.mintNft();
    const mintTxReceipt = await mintTx.wait(1);
    const tokenId = mintTxReceipt.events![0].args!.tokenId;
    console.log("Approving NFT...");
    const approveTx = await basicNft.approve(nftMarketplace.address, tokenId);
    await approveTx.wait(1);
    console.log("Listing NFT...");
    const listTx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE);
    await listTx.wait(1);
    console.log(`NFT Listed!`);
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
