.PHONY: help init build run debug db-sync unit-test system-test test all shutdown clean
.DEFAULT_GOAL := help

BOT_DEBUG?=false
DB_DEBUG?=false
SLACK_TOKEN?=
BOT_MASTER?=
DB_HOST?=giphybot_postgres_1
DB_CONTAINER?=giphybot_postgres_1

help:
	#source:http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

init: ## Installs d
	@npm install

build: ## Builds the project

run: ## Run robot
	@docker-compose run \
		-e DB_HOST=$(DB_HOST) \
		-e BOT_DEBUG=$(BOT_DEBUG) \
		-e DB_DEBUG=$(DB_DEBUG) \
		-e SLACK_TOKEN=$(SLACK_TOKEN) \
		-e BOT_MASTER=$(BOT_MASTER) \
		giphybot bash -c "npm run start"

debug: BOT_DEBUG:=true
debug: DB_DEBUG:=true
debug: run
debug: ## Run robot in debug mode

db-init: ## Synchronizes/Initializes the database
	@docker-compose run \
		-e DB_HOST=$(DB_HOST) \
		giphybot bash -c "npm run db-init"

exec-psql: ## Exec into the postgres container and runs psql
	@docker exec -it $(DB_CONTAINER) bash -c 'psql -U $${POSTGRES_USER}'

unit-test: DB_DEBUG:=true
unit-test: ## Runs the unit tests for the project
	@docker-compose run \
		-e DB_ENV=test \
		-e DB_HOST=$(DB_HOST) \
		-e DB_DEBUG=$(DB_DEBUG) \
		giphybot npm run test-unit

system-test: ## Runs the system tests for the project

test: unit-test
test: system-test
test: ## Runs all the tests for the project

all: build test
all: ## Runs the build and tests targets

shutdown: ## Stops all containers
	docker-compose stop

clean: shutdown
clean: ## Cleans environment
	-@rm -rf node_modules
