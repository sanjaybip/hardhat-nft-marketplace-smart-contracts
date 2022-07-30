import { network } from "hardhat";

export function sleep(timeinMs: number) {
    return new Promise((resolve) => setTimeout(resolve, timeinMs));
}

export async function moveBlocks(amount: number, sleepAmount = 0) {
    console.log("Moving blocks...");
    for (let index = 0; index < amount; index++) {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });
        if (sleepAmount) {
            console.log(`Sleeping for ${sleepAmount}`);
            await sleep(sleepAmount);
        }
    }
    console.log(`Moved ${amount} blocks`);
}
