from girder.plugin import getPlugin, GirderPlugin
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from .utils import get_item_assignment, save_user_annotation_as_item, get_subvolume_item_ids, \
    get_subvolume_item_info, get_subvolume_claimed_and_done_regions, get_max_region_id, \
    claim_assignment


@access.public
@autoDescribeRoute(
    Description('Get region assignment info for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id from which to get assignment', default='', required=False)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def get_user_assign_info(user, subvolume_id):
    return get_item_assignment(user, subvolume_id)


@access.public
@autoDescribeRoute(
    Description('Request to claim a region assignment checked out by another user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id that includes the region to be claimed from another owner',
           required=True)
    .param('region_id', 'region id or label trying to claim from another user owner',
           required=True)
    .errorResponse()
    .errorResponse('Request action was denied on the user.', 403)
    .errorResponse('Failed to claim the requested region', 500)
)
def claim_region_assignment(user, subvolume_id, region_id):
    return claim_assignment(user, subvolume_id, region_id)


@access.public
@autoDescribeRoute(
    Description('Save annotation for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save user annotation for', required=True)
    .param('done', 'A boolean True or False to indicate whether the annotation is done',
           dataType='boolean', default=False, required=False)
    .param('reject', 'A boolean True or False to indicate whether the annotation should be '
                     'rejected. If set to False, annotation will be saved. The default is False.',
           dataType='boolean', default=False, required=False)
    .param('comment', 'annotation comment added by the user', default='', required=False)
    .param('added_region_ids', 'list of region ids to be added', dataType=list, default=[],
           required=False)
    .param('removed_region_ids', 'list of region ids to be removed', dataType=list, default=[],
           required=False)
    .param('content_data', 'annotation content blob data to be saved on server. If reject is False'
                           ' this content_data needs to be saved',
           required=False, paramType='formData')
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save user annotations', 500)
)
def save_user_annotation(user, item_id, done, reject, comment, added_region_ids, removed_region_ids,
                         content_data):
    return save_user_annotation_as_item(user, item_id, done, reject, comment, added_region_ids,
                                        removed_region_ids, content_data)


@access.public
@autoDescribeRoute(
    Description('Get subvolume item ids.')
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get subvolume ids', 500)
)
def get_subvolume_ids():
    return get_subvolume_item_ids()


@access.public
@autoDescribeRoute(
    Description('Get the specified subvolume item info.')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get subvolume info', 500)
)
def get_subvolume_info(item):
    return get_subvolume_item_info(item)


@access.public
@autoDescribeRoute(
    Description('Get info about which users claimed which regions and what regions are completed '
                'by which user.')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get region claim info', 500)
)
def get_claimed_and_done_regions(item):
    return get_subvolume_claimed_and_done_regions(item)


@access.public
@autoDescribeRoute(
    Description('Get max region id from a subvolume. For region splitting, after getting max '
                'region id, number of split regions needs to be passed in so that server can leave '
                'enough region ids for use by split regions. Note this opeation has to be atomic '
                'due to potential multiple split region requests at the same time')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .param('split_region_count', 'number of regions to split into',dataType='integer', default=0,
           required=False)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get max region id', 500)
)
def get_new_region_ids(item, split_region_count):
    max_id = get_max_region_id(item, split_region_count)
    id_list = [max_id + i for i in range(split_region_count)]
    return id_list


class NinjatoPlugin(GirderPlugin):
    DISPLAY_NAME = 'Girder Ninjato API'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        # add plugin loading logic here
        getPlugin('jobs').load(info)
        # attach API route to Girder
        info['apiRoot'].user.route('GET', (':id', 'assignment'), get_user_assign_info)
        info['apiRoot'].user.route('POST', (':id', 'annotation'), save_user_annotation)
        info['apiRoot'].user.route('POST', (':id', 'claim_region_assignment'),
                                   claim_region_assignment)
        info['apiRoot'].system.route('GET', ('subvolume_ids',), get_subvolume_ids)
        info['apiRoot'].item.route('GET', (':id', 'subvolume_info'), get_subvolume_info)
        info['apiRoot'].item.route('GET', (':id', 'claimed_and_done_regions'),
                                   get_claimed_and_done_regions)
        info['apiRoot'].item.route('GET', (':id', 'new_region_ids'), get_new_region_ids)
