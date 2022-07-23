import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config";
import verify from "../utils/verify";
import "dotenv/config";

const deployNftMarketplace: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;
    const blockConfirmation = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;
    log(`Deploying NftMarketplace.....`);
    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: blockConfirmation,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log(`Verifying NftMarketplace Contract.....`);
        await verify(nftMarketplace.address, []);
    }
    log("-----------------------------------------");
};
export default deployNftMarketplace;
deployNftMarketplace.tags = ["all", "nftmarketplace"];
