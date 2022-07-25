import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import fs from "fs";
import "dotenv/config";
import {
    frontEndContractsFileMoralis,
    frontEndAbiLocationMoralis,
} from "../helper-hardhat-config";
const updateFrontEnd: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...");
        await updateContractAddresses(hre);
        await updateAbi(hre);
        console.log("Front end written!");
    }
};
async function updateAbi(hre: HardhatRuntimeEnvironment) {
    const { ethers } = hre;
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    fs.writeFileSync(
        `${frontEndAbiLocationMoralis}nftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json).toString()
    );

    const basicNft = await ethers.getContract("BasicNft");
    fs.writeFileSync(
        `${frontEndAbiLocationMoralis}basicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json).toString()
    );
}

async function updateContractAddresses(hre: HardhatRuntimeEnvironment) {
    const { network, ethers } = hre;
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    const contractAddresses = JSON.parse(
        fs.readFileSync(frontEndContractsFileMoralis, "utf8") || "{}"
    ); //reading current data
    const chainId = network.config.chainId!.toString(); //getting chainId from hardhat config
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplace.address)) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplace.address);
        }
    } else {
        contractAddresses[chainId] = { NftMarketplace: [nftMarketplace.address] };
    }

    fs.writeFileSync(frontEndContractsFileMoralis, JSON.stringify(contractAddresses)); // finally writing the new addressess.
}

export default updateFrontEnd;
updateFrontEnd.tags = ["all", "frontend"];
