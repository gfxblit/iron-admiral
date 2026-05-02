SPACETIME_URL := http://127.0.0.1:3000
MODULE         := iron-admiral
SERVER_DIR     := server
CLIENT_DIR     := client

.PHONY: dev stop publish e2e test build help

## Start SpaceTimeDB (in-memory) + Vite dev server
dev: publish
	cd $(CLIENT_DIR) && pnpm dev

## Start SpaceTimeDB only (background), wait for readiness, then publish module
publish:
	@if curl -sf $(SPACETIME_URL)/v1/ping >/dev/null 2>&1; then \
		echo "SpacetimeDB already running"; \
	else \
		echo "Starting SpacetimeDB..."; \
		spacetime start --in-memory & \
		for i in $$(seq 1 30); do \
			curl -sf $(SPACETIME_URL)/v1/ping >/dev/null 2>&1 && break; \
			sleep 1; \
		done; \
		curl -sf $(SPACETIME_URL)/v1/ping >/dev/null 2>&1 || (echo "ERROR: SpacetimeDB did not start" && exit 1); \
		echo "SpacetimeDB ready"; \
	fi
	cd $(SERVER_DIR) && spacetime publish --yes

## Kill SpacetimeDB and Vite
stop:
	@lsof -ti :3000 -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
	@pkill -f "spacetime start" 2>/dev/null || true
	@echo "Stopped"

## Run Playwright E2E tests (requires SpacetimeDB running — call `make publish` first)
e2e: publish
	cd $(CLIENT_DIR) && pnpm test:e2e

## Run all unit tests (client + server)
test:
	cd $(CLIENT_DIR) && pnpm test -- --coverage
	cd server/spacetimedb && cargo test

## Build client and server
build:
	cd $(CLIENT_DIR) && pnpm build
	cd server/spacetimedb && spacetime build

help:
	@grep -E '^##' Makefile | sed 's/^## //'
