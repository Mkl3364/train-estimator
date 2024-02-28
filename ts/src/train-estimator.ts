import { ApiException, DiscountCard, InvalidTripInputException, Passenger, TrainDetails, TripRequest } from "./model/trip.request";

export class TrainTicketEstimator {

    getAvailableSeats(trainDetails: TrainDetails): number {
        if (trainDetails.isFull) {
            throw new InvalidTripInputException("Train is full");
        }
        return trainDetails.seats.filter((seat) => seat.isAvailable).length;
    }

    async estimate(trainDetails: TripRequest): Promise<number> {
        const { details, passengers } = trainDetails;

        if (!passengers.length) return 0

        const { from, to, when } = details;

        if (!from.trim().length) throw new InvalidTripInputException("Start city is invalid")

        if (!to.trim().length) throw new InvalidTripInputException("Destination city is invalid");


        if (when < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0)) {
            throw new InvalidTripInputException("Date is invalid");
        }

        const ticketPrice = await this.fetchTicketApi(trainDetails);

        let totalTicketPrice = this.calculateTotalPrice(ticketPrice, trainDetails);

        if (passengers.length == 2) {
            let couple = false;
            let minor = false;
            for (let i = 0; i < passengers.length; i++) {
                if (passengers[i].discounts.includes(DiscountCard.Couple)) {
                    couple = true;
                }
                if (passengers[i].age < 18) {
                    minor = true;
                }
            }
            if (couple && !minor) {
                totalTicketPrice -= ticketPrice * 0.2 * 2;
            }
        }

        if (passengers.length == 1) {
            let halfCouple = false;
            let minor = false;
            for (let i = 0; i < passengers.length; i++) {
                if (passengers[i].discounts.includes(DiscountCard.HalfCouple)) {
                    halfCouple = true;
                }
                if (passengers[i].age < 18) {
                    minor = true;
                }
            }
            if (halfCouple && !minor) {
                totalTicketPrice -= ticketPrice * 0.1;
            }
        }

        return totalTicketPrice;
    }

    private async fetchTicketApi(trainDetails: Pick<TripRequest, 'details'>): Promise<number> {
        const url = `https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`;

        try {
            const request = await fetch(url);
            const response = await request.json();
            return response.price;
        } catch (error) {
            throw new ApiException();
        }
    }

    calculateTicketPrice(passenger: Passenger, ticketPrice: number, trainDetails: TripRequest) {
        let intermediate = ticketPrice;

        if (passenger.age < 0) {
            throw new InvalidTripInputException("Age is invalid");
        }

        if (passenger.age < 1) {
            return 0;
        }

        if (passenger.age <= 17) {
            intermediate = ticketPrice * 0.6;
        } else if (passenger.age >= 70) {
            intermediate = ticketPrice * 0.8;
            if (passenger.discounts.includes(DiscountCard.Senior)) {
                intermediate -= ticketPrice * 0.2;
            }
        } else {
            intermediate = ticketPrice * 1.2;
        }

        const currentDate = new Date();
        const tripStartDate = trainDetails.details.when;
        const daysDifference = Math.ceil((tripStartDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
        const sixHoursBeforeDeparture = new Date(tripStartDate.getTime() - 6 * 60 * 60 * 1000);

        if (daysDifference >= 30) {
            intermediate -= ticketPrice * 0.2;
        }
        else if (daysDifference > 5) {
            intermediate += (20 - daysDifference) * 0.02 * ticketPrice;
        }
        else if (daysDifference < 1) {
            if (this.getAvailableSeats(trainDetails.trainDetails) !== 0) {
                if (tripStartDate.getTime() > sixHoursBeforeDeparture.getTime()) {
                    intermediate -= ticketPrice * 0.2;
                }
            }
        }
        else {
            intermediate += ticketPrice
        }
        
        if (passenger.age > 0 && passenger.age < 4) {
            return 9;
        }

        if (passenger.discounts.includes(DiscountCard.TrainStroke)) {
            return 1;
        }

        return intermediate;
    }

    calculateTotalPrice(ticketPrice: number, trainDetails: TripRequest) {
        const { passengers } = trainDetails;

        return passengers.reduce((total, passenger) => {
            const unitPriceTicket = this.calculateTicketPrice(passenger, ticketPrice, trainDetails);

            return total + unitPriceTicket;
        }, 0)
    }
}
