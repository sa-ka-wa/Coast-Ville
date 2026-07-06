# App/Controllers/ReportsController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.PropertyModel import Property
from App.Models.TenantModel import Tenant
from App.Models.PaymentModel import Payment
from App.Models.WaterReadingModel import WaterBill, Expense
from datetime import datetime, timedelta


class ReportsController:

    @staticmethod
    @jwt_required()
    def get_monthly_report():
        """Generate monthly report for a property"""
        property_id = request.args.get('property_id')
        month = request.args.get('month')
        year = request.args.get('year')

        if not property_id:
            return jsonify({'message': 'Property ID required'}), 400

        # Parse month and year
        if month and year:
            start_date = datetime(int(year), int(month), 1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        else:
            start_date = datetime.now().replace(day=1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        # Get property
        property = Property.query.get(property_id)
        if not property:
            return jsonify({'message': 'Property not found'}), 404

        # Get tenants
        tenants = Tenant.query.filter_by(property_id=property_id, status='active').all()

        # Get payments for the month
        payments = Payment.query.filter(
            Payment.property_id == property_id,
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()

        # Get water bills for the month
        water_bills = WaterBill.query.filter(
            WaterBill.property_id == property_id,
            WaterBill.month >= start_date,
            WaterBill.month <= end_date
        ).all()

        # Get expenses for the month
        expenses = Expense.query.filter(
            Expense.property_id == property_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).all()

        # Calculate totals
        expected_rent = sum([t.monthly_rent or 0 for t in tenants])
        total_collected = sum([p.amount for p in payments if p.status == 'paid'])
        total_water = sum([b.total for b in water_bills])
        total_expenses = sum([e.amount for e in expenses])

        # Payment breakdown by method
        payment_methods = {}
        for p in payments:
            payment_methods[p.payment_method] = (payment_methods.get(p.payment_method) or 0) + p.amount

        return jsonify({
            'property': property.to_dict(),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'summary': {
                'expectedRent': expected_rent,
                'totalCollected': total_collected,
                'totalWaterBills': total_water,
                'totalExpenses': total_expenses,
                'netIncome': total_collected - total_expenses,
                'activeTenants': len(tenants)
            },
            'paymentMethods': payment_methods,
            'payments': [p.to_dict() for p in payments],
            'waterBills': [b.to_dict() for b in water_bills],
            'expenses': [e.to_dict() for e in expenses]
        }), 200

    @staticmethod
    @jwt_required()
    def get_annual_report():
        """Generate annual report for a property"""
        property_id = request.args.get('property_id')
        year = request.args.get('year')

        if not property_id:
            return jsonify({'message': 'Property ID required'}), 400

        if not year:
            year = datetime.now().year

        year = int(year)

        monthly_data = []
        for month in range(1, 13):
            start_date = datetime(year, month, 1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)

            # Get data for this month
            payments = Payment.query.filter(
                Payment.property_id == property_id,
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date
            ).all()

            expenses = Expense.query.filter(
                Expense.property_id == property_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            ).all()

            monthly_data.append({
                'month': start_date.strftime('%B'),
                'collected': sum([p.amount for p in payments if p.status == 'paid']),
                'expenses': sum([e.amount for e in expenses])
            })

        return jsonify({
            'year': year,
            'property_id': property_id,
            'monthlyData': monthly_data,
            'totalCollected': sum([m['collected'] for m in monthly_data]),
            'totalExpenses': sum([m['expenses'] for m in monthly_data]),
            'netIncome': sum([m['collected'] - m['expenses'] for m in monthly_data])
        }), 200