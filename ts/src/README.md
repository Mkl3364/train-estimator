# Train estimator exercice

## Workflow 

We first started to implement tests against the class `Train Estimator`. We implemented roughly 10 - 15 tests.

Then we refactored the class by extracting the code into functions what gave us more visiblity over the code.
We created a new class to handle the logic of the request fetch. We tried to make it conform to Open/Closed Principle by allowing to add more header whithout modifying the `TrainTicketAPI` class

We tried to follow the SOLID principle by giving the functions one responsability.

## New Features

Two new features were asked to implement.

### Left Seat Discount

For this feature, we added a new attribute to the `TripRequest` contract. We named it `TrainDetails` that takes a `seat` attribute and a `isFull` boolean attribute.

We implemented a function called `getAvailableSeats` and then calculate the discount if the train ticket is bought at least 6 hours before train departure.

### Family Card Discount

For this first feature, we added a new attribute to the `Passenger` named `lastName` to check the passenger lastName and apply a 30% discount. Passengers must be at least 2 to apply the discount.

If the psasengers have a last name we apply the discount. This card pass priority over the other card.

We implemented the `calculateFamilyCardDiscount` function to handle all logic described above.



## Mutation testing


