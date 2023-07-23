import { TextToImageResponseData } from "../../../@types/types";

const textToImageSD = async (
	prompt: string,
	samples: number = 1
): Promise<TextToImageResponseData> => {
	const headers = new Headers();

	headers.append("Content-Type", "application/json");

	const raw = JSON.stringify({
		key: process.env.AI_ART_KEY,
		prompt,
		negative_prompt:
			"((out of frame)), ((extra fingers)), mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), (((tiling))), ((naked)), ((tile)), ((fleshpile)), ((ugly)), (((abstract))), blurry, ((bad anatomy)), ((bad proportions)), ((extra limbs)), cloned face, (((skinny))), glitchy, ((extra breasts)), ((double torso)), ((extra arms)), ((extra hands)), ((mangled fingers)), ((missing breasts)), (missing lips), ((ugly face)), ((fat)), ((extra legs))",
		width: "512",
		height: "512",
		samples,
		num_inference_steps: "20",
		safety_checker: "no",
		enhance_prompt: "yes",
		seed: null,
		guidance_scale: 7.5,
		webhook: null,
		track_id: null,
	});

	try {
		const response = await fetch(
			"https://stablediffusionapi.com/api/v3/text2img",
			{
				method: "POST",
				headers,
				body: raw,
				redirect: "follow",
			}
		);

		const data: TextToImageResponseData = await response.json();

		console.log("Data", data);

		return data;
	} catch (e) {
		throw e;
	}
};

export default textToImageSD;
