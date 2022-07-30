import { moveBlocks } from "../utils/move-blocks";

async function mine() {
    await moveBlocks(3, 1000);
}

mine()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
