#!/bin/bash
set +x

# export SSH_KEY_PATH="/Users/sea066/secrets/Loc-I1.pem"

if ! [ -x "$(command -v mup)" ]; then
    echo "Meteor Up need to be installed"
    exit 1
fi

cd .deploy
mup setup
mup deploy