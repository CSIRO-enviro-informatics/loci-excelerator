#!/bin/bash
set +x

# export SSH_KEY_PATH="/Users/sea066/secrets/Loc-I1.pem"

if ! [ -x "$(command -v mup)" ]; then
    npm install -g mup
fi

cd .deploy
mup setup
mup deploy