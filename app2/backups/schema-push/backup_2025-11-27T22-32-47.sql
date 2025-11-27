{
  "timestamp": "2025-11-27T22:32:53.769Z",
  "tables": [
    {
      "name": "notifications",
      "schema": [],
      "data": [],
      "rowCount": 0
    },
    {
      "name": "daily_expense_summaries",
      "schema": [
        {
          "name": "id",
          "type": "character varying",
          "nullable": false,
          "default": "gen_random_uuid()"
        },
        {
          "name": "project_id",
          "type": "character varying",
          "nullable": false,
          "default": null
        },
        {
          "name": "date",
          "type": "text",
          "nullable": false,
          "default": null
        },
        {
          "name": "carried_forward_amount",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "total_fund_transfers",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "total_worker_wages",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "total_material_costs",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "total_transportation_costs",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "total_income",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "total_expenses",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "remaining_balance",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "created_at",
          "type": "timestamp without time zone",
          "nullable": false,
          "default": "now()"
        }
      ],
      "data": [],
      "rowCount": 0
    },
    {
      "name": "material_purchases",
      "schema": [
        {
          "name": "id",
          "type": "character varying",
          "nullable": false,
          "default": "gen_random_uuid()"
        },
        {
          "name": "project_id",
          "type": "character varying",
          "nullable": false,
          "default": null
        },
        {
          "name": "supplier_id",
          "type": "character varying",
          "nullable": true,
          "default": null
        },
        {
          "name": "material_id",
          "type": "character varying",
          "nullable": false,
          "default": null
        },
        {
          "name": "quantity",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "unit_price",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "total_amount",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "purchase_type",
          "type": "text",
          "nullable": false,
          "default": "'نقد'::text"
        },
        {
          "name": "paid_amount",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "remaining_amount",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "supplier_name",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "invoice_number",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "invoice_date",
          "type": "text",
          "nullable": false,
          "default": null
        },
        {
          "name": "due_date",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "invoice_photo",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "notes",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "purchase_date",
          "type": "text",
          "nullable": false,
          "default": null
        },
        {
          "name": "created_at",
          "type": "timestamp without time zone",
          "nullable": false,
          "default": "now()"
        }
      ],
      "data": [],
      "rowCount": 0
    },
    {
      "name": "worker_attendance",
      "schema": [
        {
          "name": "id",
          "type": "character varying",
          "nullable": false,
          "default": "gen_random_uuid()"
        },
        {
          "name": "project_id",
          "type": "character varying",
          "nullable": false,
          "default": null
        },
        {
          "name": "worker_id",
          "type": "character varying",
          "nullable": false,
          "default": null
        },
        {
          "name": "date",
          "type": "text",
          "nullable": false,
          "default": null
        },
        {
          "name": "start_time",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "end_time",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "work_description",
          "type": "text",
          "nullable": true,
          "default": null
        },
        {
          "name": "is_present",
          "type": "boolean",
          "nullable": false,
          "default": null
        },
        {
          "name": "work_days",
          "type": "numeric",
          "nullable": false,
          "default": "1.00"
        },
        {
          "name": "daily_wage",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "actual_wage",
          "type": "numeric",
          "nullable": false,
          "default": null
        },
        {
          "name": "paid_amount",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "remaining_amount",
          "type": "numeric",
          "nullable": false,
          "default": "'0'::numeric"
        },
        {
          "name": "payment_type",
          "type": "text",
          "nullable": false,
          "default": "'partial'::text"
        },
        {
          "name": "created_at",
          "type": "timestamp without time zone",
          "nullable": false,
          "default": "now()"
        }
      ],
      "data": [],
      "rowCount": 0
    }
  ]
}