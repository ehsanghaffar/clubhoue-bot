#!/bin/bash

if [ "$NODE_ENV" == "production" ] ; then
  pnpm run start
else
  pnpm run dev
fi