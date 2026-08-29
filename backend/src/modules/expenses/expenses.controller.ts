import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get() findAll() { return this.expensesService.findAll(); }
  @Get('summary') getSummary() { return this.expensesService.getSummary(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.expensesService.findOne(id); }
  @Post() create(@Body() dto: CreateExpenseDto) { return this.expensesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) { return this.expensesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.expensesService.remove(id); }
}
