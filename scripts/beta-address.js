const os = require("node:os");

const port = Number(process.env.PORT) || 4173;

function localIpv4Addresses(
  providedInterfaces
) {
  let interfaces =
    providedInterfaces;

  if (!interfaces) {
    try {
      interfaces =
        os.networkInterfaces();
    } catch (error) {
      interfaces = {};
    }
  }

  const addresses = [];

  for (const records of
    Object.values(interfaces)) {
    for (const record of records ?? []) {
      if (
        record.family === "IPv4" &&
        !record.internal &&
        record.address
      ) {
        addresses.push(record.address);
      }
    }
  }

  return [...new Set(addresses)];
}

function run() {
  const addresses = localIpv4Addresses();

  console.log("DAD RADAR FAMILY BETA");
  console.log(
    `Desktop: http://127.0.0.1:${port}`
  );

  if (addresses.length === 0) {
    console.log(
      "No local-network address was found. Confirm that the desktop is connected to the home network."
    );
    console.log(
      "Windows fallback: run ipconfig and use the Wi-Fi or Ethernet IPv4 Address with :4173."
    );
    return;
  }

  console.log("Open one of these on the iPad:");

  for (const address of addresses) {
    console.log(
      `  http://${address}:${port}`
    );
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  localIpv4Addresses
};
