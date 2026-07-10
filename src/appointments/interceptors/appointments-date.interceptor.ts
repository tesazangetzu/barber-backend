import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { format } from 'date-fns-tz';

const TIMEZONE = 'America/Lima';

function toLimaISOString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: TIMEZONE });
}

@Injectable()
export class AppointmentsDateInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (!data) return data;
        if (Array.isArray(data)) {
          return data.map((item) => this.format(item));
        }
        return this.format(data);
      }),
    );
  }

  private format(item: any): any {
    if (!item || !item.start_time) return item;
    return {
      ...item,
      start_time: toLimaISOString(item.start_time),
      end_time: toLimaISOString(item.end_time),
    };
  }
}
