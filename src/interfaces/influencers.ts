import { ITripExcursion } from "./trips";

export interface IInfluencerTrip {
	tripId: string;
	excursions: ITripExcursion[];
	imageUrl: string;
	createdAt?: Date;
}