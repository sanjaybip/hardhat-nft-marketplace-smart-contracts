import { expect } from "chai";
import { Signer } from "ethers";
import { deployments, ethers, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { BasicNft, NftMarketplace } from "../../typechain-types";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Unit Test", () => {
          let nftMarketplace: NftMarketplace;
          let nftMarketplaceContract: NftMarketplace;
          let basicNft: BasicNft;
          let deployer: Signer;
          let user: Signer;
          const PRICE = ethers.utils.parseEther("0.1");
          const TOKEN_ID = 0;

          beforeEach(async () => {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              user = accounts[1];
              await deployments.fixture(["all"]);
              nftMarketplaceContract = await ethers.getContract("NftMarketplace");
              nftMarketplace = nftMarketplaceContract.connect(deployer);
              basicNft = await ethers.getContract("BasicNft", deployer);
              await basicNft.mintNft();
              await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID);
          });
          describe("ListItem Function", () => {
              it("emits event after listing", async () => {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed"
                  );
              });

              it("Only NFT owner can list", async () => {
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await basicNft.approve(await user.getAddress(), TOKEN_ID);
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.revertedWithCustomError(nftMarketplace, "NotNftOwner");
              });
              it("List item only one time", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  //const error = `NftAlreadyListed('${basicNft.address}', ${TOKEN_ID})`;
                  //console.log(error);
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.revertedWithCustomError(nftMarketplace, "NftAlreadyListed");
              });
              it("Needs approvals to list item", async () => {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID);
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.revertedWithCustomError(nftMarketplace, "NftNotApprovedForMarketplace");
              });
              it("Updates listing with price and seller address", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  expect(listing.price).to.equal(PRICE);
                  expect(listing.seller).to.equal(await deployer.getAddress());
              });
          });
          describe("buyItem Function", () => {
              it("reverts if the item isn't listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.revertedWithCustomError(nftMarketplace, "NftNotListed");
              });
              it("reverts if the price isn't met", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.revertedWithCustomError(nftMarketplace, "PriceNotMet");
              });
              it("transfers the nft to the buyer and credit the money to seller", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit(nftMarketplace, "ItemBought");
                  const newOwner = await basicNft.ownerOf(TOKEN_ID);
                  const sellerMoney = await nftMarketplace.getProceeds(
                      await deployer.getAddress()
                  );
                  expect(sellerMoney).to.equal(PRICE);
                  expect(newOwner).to.equal(await user.getAddress());
              });
          });
          describe("cancelItem Function", () => {
              it("reverts if item is not listed", async () => {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.revertedWithCustomError(nftMarketplace, "NftNotListed");
              });
              it("reverts if not cancelled by owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.revertedWithCustomError(nftMarketplace, "NotNftOwner");
              });
              it("emits event and remove listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ListingCancelled"
                  );
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  expect(listing.price).to.equal(0);
              });
          });
          describe("updateListing Function", () => {
              it("revert update if NFT doesn't exist", async () => {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.revertedWithCustomError(nftMarketplace, "NftNotListed");
              });
              it("reverts if not updated by owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.revertedWithCustomError(nftMarketplace, "NotNftOwner");
              });
              it("updates the price of the item", async () => {
                  const newPrice = ethers.utils.parseEther("0.2");
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice);
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID);
                  expect(listing.price).to.equal(newPrice);
              });
              it("emits event after update", async () => {
                  const newPrice = ethers.utils.parseEther("0.2");
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  ).to.emit(nftMarketplace, "ItemUpdated");
              });
          });
          describe("withdrawSellerMoney Function", () => {
              it("reverts if seller has not sold any NFT", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);

                  await expect(nftMarketplace.withdrawSellerMoney()).to.revertedWithCustomError(
                      nftMarketplace,
                      "NoNFTSold"
                  );
              });
              it("Seller proceed is 0 after withdrawl", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });
                  nftMarketplace = nftMarketplaceContract.connect(deployer);
                  await nftMarketplace.withdrawSellerMoney();
                  const sellerEarned = await nftMarketplace.getProceeds(
                      await deployer.getAddress()
                  );
                  expect(sellerEarned).to.equal(0);
              });
              it("Proceed withdrawal", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE);
                  nftMarketplace = nftMarketplaceContract.connect(user);
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });
                  nftMarketplace = nftMarketplaceContract.connect(deployer);

                  const sellerEarned = await nftMarketplace.getProceeds(
                      await deployer.getAddress()
                  );
                  const selleInitialrBalance = await deployer.getBalance();

                  const txRespo = await nftMarketplace.withdrawSellerMoney();
                  const txReceipt = await txRespo.wait(1);
                  const { gasUsed, effectiveGasPrice } = txReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  const sellerFinalBalance = await deployer.getBalance();
                  expect(sellerFinalBalance.add(gasCost)).to.equal(
                      selleInitialrBalance.add(sellerEarned)
                  );
              });
          });
      });
