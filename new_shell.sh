#!/bin/bash
# commands to run on google cloud shell after restarting

gcloud config set run/region us-central1
export PROJECT_ID=$(gcloud config list --format 'value(core.project)')
gcloud config set run/platform managed