const assert = require("node:assert/strict");

const {
  localIpv4Addresses
} = require("./beta-address");

const result = localIpv4Addresses({
  Loopback: [
    {
      family: "IPv4",
      internal: true,
      address: "127.0.0.1"
    }
  ],
  Ethernet: [
    {
      family: "IPv4",
      internal: false,
      address: "192.168.1.44"
    },
    {
      family: "IPv6",
      internal: false,
      address: "fe80::1"
    }
  ],
  WiFi: [
    {
      family: "IPv4",
      internal: false,
      address: "192.168.1.44"
    }
  ]
});

assert.deepEqual(result, ["192.168.1.44"]);

assert.deepEqual(
  localIpv4Addresses({}),
  []
);

console.log("Beta address tests passed.");
