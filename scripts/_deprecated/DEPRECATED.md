These scripts have been replaced by the unified Deployment Engine.
See: server/services/deployment-engine.ts

Replaced scripts:
- build-and-deploy.sh → web-deploy pipeline
- deploy_via_git.sh → git-push pipeline
- push_repo.sh → stepGitPush (inline git commands)
- remote-build.sh → stepBuildServer + stepDeployServer
