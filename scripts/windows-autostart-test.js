"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  TASK_NAME,
  assertSucceeded,
  interpretCalendarHealth,
  interpretTaskQuery,
  createTaskXml,
  elevatedTaskScript,
  encodePowerShell,
  escapeXml,
  quotePowerShellLiteral,
  requireWindows,
  runElevatedTaskAction,
  waitForHealth,
  writeTaskXml
} = require("./windows-autostart");

assert.equal(
  escapeXml(`<Dad & "Radar">`),
  "&lt;Dad &amp; &quot;Radar&quot;&gt;"
);

assert.equal(
  quotePowerShellLiteral(
    "C:\\Joey's Files"
  ),
  "'C:\\Joey''s Files'"
);

const xml = createTaskXml({
  nodePath:
    "C:\\Program Files\\nodejs\\node.exe",
  hostScript:
    "C:\\Users\\Joey & Family\\Dad-Radar\\scripts\\family-beta-host.js",
  workingDirectory:
    "C:\\Users\\Joey & Family\\Dad-Radar"
});

for (const expected of [
  '<Task version="1.3"',
  "<BootTrigger>",
  "<Delay>PT20S</Delay>",
  "<UserId>S-1-5-18</UserId>",
  "<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>",
  "<StartWhenAvailable>true</StartWhenAvailable>",
  "<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>",
  "<RestartOnFailure>",
  "C:\\Program Files\\nodejs\\node.exe",
  "Joey &amp; Family",
  `<URI>\\${TASK_NAME}</URI>`
]) {
  assert.match(
    xml,
    new RegExp(
      expected.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )
    )
  );
}

const installScript =
  elevatedTaskScript(
    "install",
    {
      taskXmlPath:
        "C:\\Dad Radar\\task.xml"
    }
  );

assert.match(
  installScript,
  /\/Create/
);
assert.match(
  installScript,
  /\/Run/
);
assert.match(
  installScript,
  /Dad Radar Family Beta/
);

assert.match(
  elevatedTaskScript("restart"),
  /\/End[\s\S]*\/Run/
);

assert.match(
  elevatedTaskScript("remove"),
  /\/Delete/
);

assert.throws(
  () => elevatedTaskScript("unknown"),
  /Unsupported/
);

assert.deepEqual(
  interpretCalendarHealth(
    200,
    { ok: true }
  ),
  {
    ok: true,
    authorizationRequired: false
  }
);

assert.deepEqual(
  interpretTaskQuery({ status: 0 }),
  {
    installed: true,
    permissionDenied: false
  }
);

assert.deepEqual(
  interpretTaskQuery({
    status: 1,
    stderr: "ERROR: Access is denied."
  }),
  {
    installed: false,
    permissionDenied: true
  }
);

assert.deepEqual(
  interpretTaskQuery({
    status: 1,
    stderr: "The system cannot find the file specified."
  }),
  {
    installed: false,
    permissionDenied: false
  }
);

assert.deepEqual(
  interpretCalendarHealth(
    401,
    {
      ok: false,
      code:
        "calendar-authorization-required"
    }
  ),
  {
    ok: false,
    authorizationRequired: true
  }
);

const encoded = encodePowerShell(
  "Write-Output 'Dad Radar'"
);

assert.equal(
  Buffer
    .from(encoded, "base64")
    .toString("utf16le"),
  "Write-Output 'Dad Radar'"
);

let elevatedInvocation = null;

const elevatedResult =
  runElevatedTaskAction(
    "install",
    {
      spawnSync(command, args, options) {
        elevatedInvocation = {
          command,
          args,
          options
        };

        return { status: 0 };
      }
    }
  );

assert.equal(
  elevatedResult.status,
  0
);
assert.equal(
  elevatedInvocation.command,
  "powershell.exe"
);
assert.ok(
  elevatedInvocation.args.includes(
    "-EncodedCommand"
  )
);
assert.equal(
  elevatedInvocation.options.windowsHide,
  true
);

assert.doesNotThrow(() => {
  assertSucceeded(
    { status: 0 },
    "Test action"
  );
});

assert.throws(
  () => {
    assertSucceeded(
      { status: 1 },
      "Test action"
    );
  },
  /failed or the Windows permission prompt was canceled/
);

assert.doesNotThrow(() => {
  requireWindows("win32");
});

assert.throws(
  () => requireWindows("linux"),
  /only be installed on Windows/
);

async function testHealthWait() {
  const states = [
    false,
    false,
    true
  ];

  let waits = 0;

  const healthy = await waitForHealth({
    attempts: 5,
    intervalMs: 25,
    healthCheck: async () =>
      states.shift(),
    delay: async (milliseconds) => {
      assert.equal(milliseconds, 25);
      waits += 1;
    }
  });

  assert.equal(healthy, true);
  assert.equal(waits, 2);
}

const temporaryDirectory =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "dad-radar-autostart-"
    )
  );

try {
  const taskXmlPath = path.join(
    temporaryDirectory,
    "runtime",
    "task.xml"
  );

  writeTaskXml({
    taskXmlPath,
    nodePath:
      "C:\\Program Files\\nodejs\\node.exe",
    hostScript:
      "C:\\Dad-Radar\\scripts\\family-beta-host.js",
    workingDirectory:
      "C:\\Dad-Radar"
  });

  const bytes = fs.readFileSync(
    taskXmlPath
  );

  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xfe);

  const writtenXml = bytes
    .subarray(2)
    .toString("utf16le");

  assert.match(
    writtenXml,
    /Dad Radar Family Beta/
  );
} finally {
  fs.rmSync(
    temporaryDirectory,
    {
      recursive: true,
      force: true
    }
  );
}

Promise.resolve()
  .then(testHealthWait)
  .then(() => {
    console.log(
      "Windows automatic-startup tests passed."
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
