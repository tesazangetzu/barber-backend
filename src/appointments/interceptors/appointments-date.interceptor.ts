import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Lima';

function toLimaISOString(date: Date): string {
  const d = toZonedTime(date, TIMEZONE);
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${M}-${D}T${h}:${m}:${s}-05:00`;
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
