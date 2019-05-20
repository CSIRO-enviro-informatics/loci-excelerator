#!/bin/bash
set +x

# export SSH_KEY_PATH="/Users/sea066/secrets/Loc-I1.pem"

npm install mup
 
cd .deploy
npx mup setup
npx mup deploy