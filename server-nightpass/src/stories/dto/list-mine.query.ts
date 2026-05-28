import { IsUUID } from 'class-validator';

export class ListMineStoriesQuery {
  @IsUUID('all')
  venueId!: string;
}
