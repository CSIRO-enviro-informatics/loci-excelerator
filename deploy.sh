#!/bin/bash
set +x

TEMP_PATH=$SSH_KEY_PATH
echo the path is $TEMP_PATH
echo the contents is `cat $TEMP_PATH`
echo `cat README.md`