import { Document } from "mongoose";

export interface IUser extends Document {
	discordId: string;
	apiToken: Buffer;
	commandCount: number;
}

export interface TextToImageResponseData {
	status: string;
	generationTime: number;
	id: number;
	output: string[];
	meta: {
		H: number;
		W: number;
		enable_attention_slicing: string;
		file_prefix: string;
		guidance_scale: number;
		model: string;
		n_samples: number;
		negative_prompt: string;
		outdir: string;
		prompt: string;
		revision: string;
		safetychecker: string;
		seed: number;
		steps: number;
		vae: string;
	};
}
