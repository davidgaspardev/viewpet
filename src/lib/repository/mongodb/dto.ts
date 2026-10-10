import { Guardian, PetGender } from "@/types/pet";
import { ObjectId } from "mongodb";


export type PetStatus = "reserved" | "active" | "lost";

export type PetDoc = {
  _id: string;
  status: PetStatus;
  name?: string;
  pictureUrl?: string;
  birthdate?: string;
  gender?: PetGender;
  guardianIds?: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type GuardianDoc = {
  _id: ObjectId;
  name: string;
  email?: string;
  phones: Guardian["phones"];
  social: Guardian["social"];
  createdAt: Date;
  updatedAt: Date;
};

export type LostEventDoc = {
  _id: ObjectId;
  petId: string;
  startedAt: string;
  endedAt: string | null;
  lastSeenLocation?: string;
  lastSeenAt?: string;
  alerts?: string[];
  createdAt: Date;
  updatedAt: Date;
};
