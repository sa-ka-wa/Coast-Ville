# App/Controllers/ExpensesController.py
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.Extension import db
from App.Models.WaterReadingModel import Expense
from datetime import datetime
import uuid


class ExpensesController:

    @staticmethod
    @jwt_required()
    def get_expenses():
        """Get all expenses (optionally filtered by property)"""
        property_id = request.args.get('property_id')
        category = request.args.get('category')
        status = request.args.get('status')

        query = Expense.query

        if property_id:
            query = query.filter_by(property_id=property_id)
        if category:
            query = query.filter_by(category=category)
        if status:
            query = query.filter_by(status=status)

        expenses = query.order_by(Expense.expense_date.desc()).all()
        return jsonify([e.to_dict() for e in expenses]), 200

    @staticmethod
    @jwt_required()
    def create_expense():
        """Create a new expense"""
        data = request.json

        expense = Expense(
            property_id=data.get('property_id'),
            category=data.get('category'),
            description=data.get('description'),
            amount=data.get('amount'),
            expense_date=datetime.strptime(data.get('expense_date'), '%Y-%m-%d').date() if data.get(
                'expense_date') else datetime.now().date(),
            receipt_no=f"EXP-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            vendor_name=data.get('vendor_name'),
            notes=data.get('notes'),
            status='pending'
        )

        db.session.add(expense)
        db.session.commit()

        return jsonify({
            'message': 'Expense recorded successfully',
            'expense': expense.to_dict()
        }), 201

    @staticmethod
    @jwt_required()
    def update_expense(expense_id):
        """Update an expense"""
        expense = Expense.query.get(expense_id)
        if not expense:
            return jsonify({'message': 'Expense not found'}), 404

        data = request.json
        expense.category = data.get('category', expense.category)
        expense.description = data.get('description', expense.description)
        expense.amount = data.get('amount', expense.amount)
        expense.vendor_name = data.get('vendor_name', expense.vendor_name)
        expense.notes = data.get('notes', expense.notes)
        expense.status = data.get('status', expense.status)

        db.session.commit()

        return jsonify({
            'message': 'Expense updated successfully',
            'expense': expense.to_dict()
        }), 200

    @staticmethod
    @jwt_required()
    def delete_expense(expense_id):
        """Delete an expense"""
        expense = Expense.query.get(expense_id)
        if not expense:
            return jsonify({'message': 'Expense not found'}), 404

        db.session.delete(expense)
        db.session.commit()

        return jsonify({'message': 'Expense deleted successfully'}), 200

    @staticmethod
    @jwt_required()
    def get_expense_stats():
        """Get expense statistics"""
        property_id = request.args.get('property_id')

        query = Expense.query
        if property_id:
            query = query.filter_by(property_id=property_id)

        expenses = query.all()

        total = sum([e.amount for e in expenses])
        this_month = sum([e.amount for e in expenses if e.expense_date.month == datetime.now().month])
        last_month = sum([e.amount for e in expenses if e.expense_date.month == datetime.now().month - 1])

        # Category breakdown
        categories = {}
        for e in expenses:
            categories[e.category] = (categories.get(e.category) or 0) + e.amount

        return jsonify({
            'total': total,
            'thisMonth': this_month,
            'lastMonth': last_month,
            'categories': categories,
            'count': len(expenses)
        }), 200