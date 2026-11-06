# Retained analysis helpers

These scripts preserve methods already used in the investigation. They are not runtime dependencies of Ultra Craft. Review their target paths and architecture assumptions before running.

| File | Purpose |
| --- | --- |
| DumpSelected.java | Ordinary JADX class dumps for selected class prefixes |
| read-dex-constants.py | Ordinary encoded DEX static field extraction |
| list-qt-hooks.js | Frida export inventory for locating Qt functions |
| trace-store-urls.js | Passive ARM64 Qt/OpenSSL method and URL metadata capture |

The direct decompiler helper requires Java 21 and the pinned JADX headless provider JAR 0.7.1. Its verified SHA-256 is `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`. The JAR is a downloadable tooling dependency, not duplicated in this repo. The original local copy is `/tmp/ultra-craft-research/jadx-headless-mcp-0.7.1-all.jar`; the existing Java runtime is inside IntelliJ IDEA Community Edition.app/Contents/jbr/Contents/Home.

```sh
java -Xmx3g --class-path /path/to/jadx-headless-mcp-0.7.1-all.jar   docs/research/tools/DumpSelected.java /path/to/LineOS.apk /path/to/output com.ultrabar
```

REA CLI 6.7.0 can inspect Android classes/methods with JAVA_HOME and REA_JADX_MCP_JAR pointing to those dependencies. Nested class names use dots in REA class lookup. Keep REA Evidence separate from direct script output.

```sh
npx -y rea-agents@6.7.0 instrument-with-frida attach CURRENT_PID   --script-file docs/research/tools/trace-store-urls.js   --duration-ms 60000 --format json
```

CURRENT_PID is a placeholder; inspect the running target before attaching. The trace creates a readiness marker under /tmp/ultra-craft-research; ensure that directory exists. Retain output privately first and review redaction. Do not start app install/uninstall actions before the capture is ready. These passive hooks successfully captured a public Zoom download URL on the investigated ARM64 macOS build, not a complete marketplace request contract.
