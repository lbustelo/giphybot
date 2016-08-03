.PHONY: help init build run debug unit-test system-test test all
.DEFAULT_GOAL := help

BOT_DEBUG?=false
SLACK_TOKEN?=
BOT_MASTER?=

help:
	#source:http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

init: ## Installs d
	@npm install

build: ## Builds the project

run: ## Run robot
	BOT_DEBUG=$(BOT_DEBUG) SLACK_TOKEN=$(SLACK_TOKEN) BOT_MASTER=$(BOT_MASTER) node robot.js

debug: BOT_DEBUG:=true
debug: run
debug: ## Run robot in debug mode

unit-test: ## Runs the unit tests for the project

system-test: ## Runs the system tests for the project

test: unit-test
test: system-test
test: ## Runs all the tests for the project

all: build test
all: ## Runs the build and tests targets

clean: ## Cleans environment
	-@rm -rf node_modules
