import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { UserAlreadyParticipatingException } from 'src/webinars/exceptions/user-already-participating';
import { WebinarNoRemainingSeatsException } from 'src/webinars/exceptions/webinar-no-remaining-seats';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}
  async execute({ webinarId, user }: Request): Promise<Response> {
    const webinar = await this.webinarRepository.findById(webinarId);

    if (!webinar) {
      throw new WebinarNotFoundException();
    }

    const participations =
      await this.participationRepository.findByWebinarId(webinarId);

    const isAlreadyParticipating = participations.some(
      (participation) => participation.props.userId === user.props.id,
    );

    if (isAlreadyParticipating) {
      throw new UserAlreadyParticipatingException();
    }

    const noRemainingSeats = participations.length >= webinar.props.seats;
    if (noRemainingSeats) {
      throw new WebinarNoRemainingSeatsException();
    }

    const participation = new Participation({
      webinarId,
      userId: user.props.id,
    });

    await this.participationRepository.save(participation);

    const organizer = await this.userRepository.findById(
      webinar.props.organizerId,
    );

    if (organizer) {
      await this.mailer.send({
        to: organizer.props.email,
        subject: `New participant for "${webinar.props.title}"`,
        body: `${user.props.email} booked a seat for "${webinar.props.title}".`,
      });
    }
  }
}
