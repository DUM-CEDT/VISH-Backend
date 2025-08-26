import streamlit as st
import pandas as pd
import plotly.express as px
import requests

# --- Configuration ---
API_URL = "https://iot-backend-ns3sud4lw-nat-siriruangbuns-projects.vercel.app/data/"
COLLECTIONS = ["Food", "Temperature", "Water"] # Replace with your actual collection names

st.set_page_config(layout="wide") # Use a wide layout for better graph visibility

# --- Functions to fetch data ---
def fetch_data(collection_name):
    """
    Fetches data from the specified API endpoint.
    Returns a pandas DataFrame or None if an error occurs.
    """
    try:
        response = requests.get(f"{API_URL}/{collection_name}")
        response.raise_for_status() # Raise an error for bad status codes
        data = response.json()
        df = pd.DataFrame(data)
        if not df.empty:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        return df
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching data: {e}")
        return None

# --- Streamlit Dashboard Layout ---
st.title("My Pet Dashboard")

# 1. Collection Selector
selected_collection = st.sidebar.selectbox("Select a Collection", COLLECTIONS)

# 2. Fetch and prepare data
if selected_collection:
    data_df = fetch_data(selected_collection)
    
    if data_df is not None and not data_df.empty:
        # Get min and max dates from the data for the date input widgets
        min_date = data_df['timestamp'].min().date()
        max_date = data_df['timestamp'].max().date()

        # 3. Date Range Selector
        st.sidebar.subheader("Select Date Range")
        start_date = st.sidebar.date_input("Start Date", min_value=min_date, max_value=max_date, value=min_date)
        end_date = st.sidebar.date_input("End Date", min_value=min_date, max_value=max_date, value=max_date)

        # Filter data based on selected date range
        filtered_df = data_df[(data_df['timestamp'].dt.date >= start_date) & (data_df['timestamp'].dt.date <= end_date)]

        if not filtered_df.empty:
            st.subheader(f"Data for {selected_collection} from {start_date} to {end_date}")

            # 4. Plotting the graph using Plotly
            fig = px.line(
                filtered_df,
                x='timestamp',
                y='amount',
                title=f'Amount over Time for {selected_collection}',
                labels={'timestamp': 'Timestamp', 'amount': 'Amount'},
                markers=True
            )

            # Customize the layout for better readability
            fig.update_xaxes(title_text="Timestamp")
            fig.update_yaxes(title_text="Amount")
            fig.update_traces(line=dict(width=2))

            # Display the plot in the dashboard
            st.plotly_chart(fig, use_container_width=True)

            # Optional: Display the raw data table
            with st.expander("View Raw Data"):
                st.dataframe(filtered_df)
        else:
            st.warning("No data available for the selected date range.")
    else:
        st.info("No data available for this collection or API is not responding.")