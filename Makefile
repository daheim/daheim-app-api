
all: push

image:
	docker build -t egergo/daheim:latest .

push: image
	docker push egergo/daheim:latest

.PHONY: all image
