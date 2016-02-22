IMAGE ?= egergo/daheim:latest

all: push

image:
	docker build -t $(IMAGE) .

push: image
	docker push $(IMAGE)

.PHONY: all image
