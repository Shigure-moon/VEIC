# Coordination Scripts

Main command:

```powershell
scripts/coord/veic-coord.ps1 status
```

Examples:

```powershell
scripts/coord/veic-coord.ps1 add -Title "Build Workspace Search" -Area soft -Owner frontend-agent
scripts/coord/veic-coord.ps1 claim -TaskId VEIC-001 -Owner frontend-agent
scripts/coord/veic-coord.ps1 start -TaskId VEIC-001 -Owner frontend-agent
scripts/coord/veic-coord.ps1 note -TaskId VEIC-001 -Note "Split TitleBar and WorkspaceList."
scripts/coord/veic-coord.ps1 done -TaskId VEIC-001 -Owner frontend-agent -Note "npm run check passed."
scripts/coord/veic-coord.ps1 report
scripts/coord/veic-coord.ps1 sync-api
scripts/coord/veic-coord.ps1 check -Area soft
scripts/coord/veic-coord.ps1 check -Area server
```

