#!/bin/bash

if [ "$NODE_ENV" == "production" ] ; then
  pnpm start
else
  pnpm dev
fi