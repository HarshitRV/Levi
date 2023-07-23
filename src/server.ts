import express, { Express, NextFunction, Request, Response } from "express";

const server: Express = express();

const PORT: string = process.env.PORT!;

server.all("/", (req: Request, res: Response) => {
	return res.status(200).send({
		msg: `Levi is running on ${PORT}`,
	});
});

server.get("/alive", (req: Request, res: Response) => {
	return res.status(200).send({
		msg: "Alive and running",
	});
});

export const keepAlive = () => {
	server.listen(PORT, () => {
		console.log(`Levi running on ${PORT}`);
	});
};
