import { ethers, network } from "hardhat";
import { developmentChains } from "../helper-hardhat-config";
import { BasicNft } from "../typechain-types";
import { moveBlocks } from "../utils/move-blocks";

async function mintNft() {
    let basicNft: BasicNft;

    basicNft = await ethers.getContract("BasicNft");
    console.log(`Miniting NFT....`);
    const mintTx = await basicNft.mintNft();
    const mintTxReceipt = await mintTx.wait(1);
    console.log(
        `Minted tokenId ${mintTxReceipt.events![0].args!.tokenId.toString()} from contract: ${
            basicNft.address
        }`
    );

    if (developmentChains.includes(network.name)) {
        await moveBlocks(2, 1000);
    }
}

mintNft()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
