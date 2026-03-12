.PHONY: dev build test lint typecheck docker-up docker-down clean install infra infra-down demo reset

install:
	pnpm install

dev:
	docker compose -f docker-compose.dev.yml up -d
	pnpm turbo dev

build:
	pnpm turbo build

test:
	pnpm turbo test

lint:
	pnpm turbo lint

typecheck:
	pnpm turbo typecheck

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

infra:
	docker compose -f docker-compose.dev.yml up -d

infra-down:
	docker compose -f docker-compose.dev.yml down

demo:
	pnpm --filter @obs/demo-app dev

clean:
	pnpm turbo clean
	rm -rf node_modules

reset:
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v
