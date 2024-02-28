export class Passenger {
    constructor(readonly age: number, readonly discounts: DiscountCard[]){}
}

export class TripRequest {
    constructor(readonly details: TripDetails, readonly passengers: Passenger[], readonly trainDetails: TrainDetails){}
}

export class TripDetails {
    constructor(readonly from: string, readonly to: string, readonly when: Date) {
    }
}

export class Seat {
    constructor(readonly number: number, readonly isAvailable: boolean) {}

}

export class TrainDetails {
    constructor(readonly seats: Seat[], readonly isFull: boolean) {}
}

export class InvalidTripInputException extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidTrainSeatException extends Error {
    constructor() {
        super("Train is full");
    }

}

export class ApiException extends Error {
    constructor() {
        super("Api error");
    }
}

export enum DiscountCard {
    Senior = "Senior",
    TrainStroke= "TrainStroke",
    Couple = "Couple",
    HalfCouple = "HalfCouple",
}