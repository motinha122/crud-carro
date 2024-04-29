import Fastify from "fastify";

import fs from "fs";

import { promisify } from "util"; 

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const fastify = Fastify({
  logger: { 
    transport: {
      target: "pino-pretty"
    },
  },
});

let cars = [];

fastify.addHook("onRequest", async (req, reply) => {
  cars = await loadFile();
  fastify.log.info("[Event] Request hook handled");
});

fastify.addHook("onResponse", async (req, reply) => {
  if (!(req.routeOptions.method === "GET")) {
    saveFile()
    fastify.log.info("[Event] Response hook handled");
  }
});

function generateID(cars) {
  const maxId = cars.reduce((maxValue, current) => {
    if (current.id > maxValue) {
      return maxValue = current.id
    }
  },0)
  return maxId + 1;
}

function searchcar(id) {
  const car = cars.find((element) => element.id == id)
  if (car) {
    return car;
  }
  return null;
}

function pagination(page, items){
  let init = 0;
  let end = 0;

  init = (Number(page) - 1) * Number(items);
  end = init + Number(items);

  fastify.log.info(init);
  fastify.log.info(end);

  return cars.slice(init,end);
}

async function saveFile() {
  try {
    await writeFile("cars.json", JSON.stringify(cars));
    fastify.log.info("[Database] Saved");
  } catch (error) {
    fastify.log.error(error)
  }
}

async function loadFile() {
  try {
    const carsRaw = await readFile("cars.json");
    fastify.log.info("[Database] Loaded");
    return JSON.parse(carsRaw);
  } catch (error) {
    fastify.log.error(error);
  }
}

fastify.get("/api/v1/carros/page/:page/:items", async function handler(request, reply) {
  const { page, items } = request.params;
  fastify.log.info(page);
  fastify.log.info(items);
  fastify.log.info("[GET] Read cars - page: " + page + " items: " + items);
  return pagination(page, items);
});

fastify.get("/api/v1/carros/:id", async function handler(request, reply) {
  const { id } = request.params;
  fastify.log.info("[GET] Read car - id: " + id);
  return searchcar(id);
});

fastify.post("/api/v1/carros", async function handler(request, reply) {
  let body = request.body;
  body.id = generateID(cars);
  cars.push(body);
  fastify.log.info("[POST] Created car - id: " + body.id);
  return body;
});

fastify.put("/api/v1/carros/:id", async function handler(request, reply) {
  const { id } = request.params;
  const body = request.body;

  for (let i = 0; i < cars.length; i++) {
    if (id == cars[i].id) {
      if (body.Cor) {
        cars[i].Cor = body.Cor;
      }
      if (body.Preço) {
        cars[i].Preço = body.Preço;
      }
      if (body.Tamanho) {
        cars[i].Tamanho = body.Tamanho;
      }
      break;
    }
  }
  fastify.log.info("[PUT] Updated car - id: " + id);
  return body;
});

fastify.delete("/api/v1/carros/:id", async function handler(request, reply) {
  const { id } = request.params;
  const index = cars.findIndex((obj) => obj.id == id);
  cars.splice(index, 1);
  fastify.log.info("[DELETE] Deleted car - id: " + id);
  return { "deleted carro": id };
});

try {
  await fastify.listen({ port: 3000 });
  fastify.log.info(
    `carro API Server rodando na porta ${
      fastify.server.address().port
    }`
  );

} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}