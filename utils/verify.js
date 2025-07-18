const { run } = require("hardhat");

async function verify(Contractaddress, args) {

  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: Contractaddress,
      constructorArguments: args,
    });
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.error(error);
    }
  }

}
module.exports = {verify};
