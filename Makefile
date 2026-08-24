.PHONY: up down logs seed test build

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	docker compose exec backend npm run seed

test:
	npm test --prefix backend

build:
	docker compose build
