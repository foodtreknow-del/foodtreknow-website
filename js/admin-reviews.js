(function exposeAdminReviews(){
  'use strict';
  const client=window.FoodTrekNowSupabaseClient;
  async function query(builder){const {data,error}=await builder;if(error)throw error;return data||[];}
  async function load(){
    if(!client)throw new Error('The secure review connection is unavailable.');
    const [truck,event,opportunity]=await Promise.all([
      query(client.from('truck_reviews').select('*, trucks(name), reviewer:profiles!truck_reviews_reviewer_id_fkey(first_name,last_name,preferred_name)').order('created_at',{ascending:false})),
      query(client.from('event_reviews').select('*, opportunities(title), reviewer:profiles!event_reviews_reviewer_id_fkey(first_name,last_name,preferred_name)').order('created_at',{ascending:false})),
      query(client.from('opportunity_reviews').select('*, opportunities(title), reviewer:profiles!opportunity_reviews_reviewer_id_fkey(first_name,last_name,preferred_name)').order('created_at',{ascending:false}))
    ]);
    return [
      ...truck.map(item=>({...item,reviewType:'truck',subject:item.trucks?.name||'Food Truck'})),
      ...event.map(item=>({...item,reviewType:'event',subject:item.opportunities?.title||'Event'})),
      ...opportunity.map(item=>({...item,reviewType:'opportunity',subject:item.opportunities?.title||'Event Opportunity'}))
    ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }
  async function remove(reviewType,reviewId,reason){const {data,error}=await client.rpc('remove_platform_review',{p_review_type:reviewType,p_review_id:reviewId,p_reason:reason||null});if(error)throw error;return data;}
  window.FoodTrekNowAdminReviews=Object.freeze({available:Boolean(client),load,remove});
})();
