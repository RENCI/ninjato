from girder.plugin import getPlugin, GirderPlugin
from girder.api import access
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from .endpoint_utils import get_item_assignment, save_user_annotation_as_item, get_subvolume_item_ids, \
    get_subvolume_item_info, get_region_or_assignment_info, get_available_region_ids, \
    claim_assignment, request_assignment, get_all_avail_items_for_review, \
    get_region_comment_info, save_user_review_result_as_item, remove_region_from_item_assignment


@access.public
@autoDescribeRoute(
    Description('Get assignment info for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id from which to get assignment. If it is not set, all '
                           'active assignment for the user across all subvolumes will be '
                           'returned along with all assignments the user has a role with, '
                           'and an empty list will be returned if the user does not have a role '
                           'in any assignment. If the subvolume_id is set, if request_new is '
                           'False, the active assignments for the user in the specified subvolume '
                           'will be returned; otherwise, if the user does not currently have '
                           'active refine assignment, a new available assignment will be created '
                           'and returned and an exception will be raised if the user already '
                           'have active refine assignment.',
           default='', required=False)
    .param('request_new', 'whether to request new assignment for refine action. Default is False.',
           dataType='boolean', default=False, required=False)
    .param('training', 'A boolean True or False to indicate whether to get assignment from traing '
                       'subvolume or not. Default is False',
           dataType='boolean', default=False, required=False)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def get_user_assign_info(user, subvolume_id, request_new, training):
    return get_item_assignment(user, subvolume_id, request_new, training)


@access.public
@autoDescribeRoute(
    Description('Request to claim an annotation assignment that includes the region id label to '
                'be claimed. If the region to be claimed in an assignment is already done or '
                'currently assigned to another user, the claim action will fail; otherwise, '
                'the region to be claimed will be successfully assigned to the user')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id that includes the region to be claimed from another owner',
           required=True)
    .param('active_assignment_id', 'the active assignment item id from the user to add the claimed '
                                   'region into',
           required=True)
    .param('claim_region_id', 'region id or label to find the assignment to be claimed',
           required=True)
    .jsonParam('current_region_ids', 'list of region ids that are included in the current assignment',
               required=False, requireArray=True, paramType='formData')
    .param('content_data', 'current assignment user annotated mask content blob data to be saved '
                           'on server before merging',
           required=False, paramType='formData')
    .errorResponse()
    .errorResponse('Request action was denied on the user.', 403)
    .errorResponse('Failed to claim the requested region', 500)
)
def claim_region_assignment(user, subvolume_id, active_assignment_id, claim_region_id,
                            current_region_ids, content_data):
    if current_region_ids is None:
        current_region_ids = []
    return claim_assignment(user, subvolume_id, active_assignment_id, claim_region_id,
                            current_region_ids, content_data)


@access.public
@autoDescribeRoute(
    Description('Request to remove a region from a user\'s assignment. If the action is '
                'successful, the region will be removed from the user\' assignment and '
                'available to be assigned to another user')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id that includes the region to be removed',
           required=True)
    .param('active_assignment_id', 'the active assignment item id from which the user to remove '
                                   'the region',
           required=True)
    .param('region_id', 'region id or label to remove from the assignment',
           required=True)
    .jsonParam('current_region_ids', 'list of region ids that are included in the current assignment',
               required=False, requireArray=True, paramType='formData')
    .param('content_data', 'current assignment user annotated mask content blob data to be saved '
                           'on server before removing',
           required=False, paramType='formData')
    .errorResponse()
    .errorResponse('Request action was denied on the user.', 403)
    .errorResponse('Failed to remove the requested region from the assignment', 500)
)
def remove_region_from_assignment(user, subvolume_id, active_assignment_id, region_id,
                                  current_region_ids, content_data):
    if current_region_ids is None:
        current_region_ids = []
    return remove_region_from_item_assignment(user, subvolume_id, active_assignment_id, region_id,
                                              current_region_ids, content_data)


@access.public
@autoDescribeRoute(
    Description('Request a region assignment for annotation or review. If the requested item has '
                'already been annotated or assigned to another user for annotation, the request '
                'will fail; If the requesting user already has active annotation assignment, '
                'the request will also fail since a user is only allowed to have one active '
                'assignment')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('subvolume_id', 'subvolume id that includes the requesting assignment.',
           required=True)
    .param('assign_item_id', 'assignment item ID to request assignment for. If set, it will '
                             'take precedence over request_region_id; otherwise, if not set, '
                             'request_region_id has to be set.', required=False)
    .param('request_region_id', 'region id to request the assignment containing the region',
           required=False)
    .param('request_review_assignment',
           'Whether to request review assignment or annotation assignment',
           dataType='boolean', default=False, required=False)
    .errorResponse()
    .errorResponse('Request action was denied on the user.', 403)
    .errorResponse('Failed to request the requested region', 500)
)
def request_region_assignment(user, subvolume_id, assign_item_id, request_region_id,
                              request_review_assignment):
    return request_assignment(user, subvolume_id, assign_item_id, request_region_id,
                              request_review_assignment)


@access.public
@autoDescribeRoute(
    Description('Save annotation for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The item ID to save user annotation for', required=True)
    .param('done', 'A boolean True or False to indicate whether the annotation is done',
           dataType='boolean', default=False, required=False)
    .param('reject', 'A boolean True or False to indicate whether the user wants to reject '
                     'annotation assignment. If set to False, annotation will be saved. '
                     'The default is False.', dataType='boolean', default=False, required=False)
    .jsonParam('comment', 'a JSON object with region label as key to save annotation comment per '
                          'region added by the user',
               paramType='form', requireObject=True, required=False)
    .jsonParam('color', 'a JSON object with region label as key to save color string per region '
                        'added by the user',
               paramType='form', requireObject=True, required=False)
    .jsonParam('current_region_ids', 'list of region ids that are included in the annotated mask',
               required=False, requireArray=True, paramType='formData')
    .param('content_data', 'annotation content blob data to be saved on server. If reject is False'
                           ' this content_data needs to be saved',
           required=False, paramType='formData')
    .errorResponse()
    .errorResponse('Save action was denied on the user.', 403)
    .errorResponse('Failed to save user annotations', 500)
)
def save_user_annotation(user, item_id, done, reject, comment, color, current_region_ids,
                         content_data):
    if current_region_ids is None:
        current_region_ids = []
    if comment is None:
        comment = {}
    if color is None:
        color = {}
    return save_user_annotation_as_item(user, item_id, done, reject, comment, color,
                                        current_region_ids, content_data)


@access.public
@autoDescribeRoute(
    Description('Save user review result')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .param('item_id', 'The assignment item ID to save user review result for', required=True)
    .param('done', 'A boolean True or False to indicate whether the review is done',
           dataType='boolean', default=False, required=False)
    .param('reject', 'A boolean True or False to indicate whether the user wants to reject review '
                     'assignment. If set to False, review result will be saved. '
                     'The default is False.', dataType='boolean', default=False, required=False)
    .jsonParam('comment', 'review comment per region added by the user',
               paramType='form', requireObject=True, required=False)
    .param('approve', 'A boolean True or False to indicate whether the review user approves '
                      'the annotation', dataType='boolean', required=True)
    .jsonParam('current_region_ids', 'list of region ids that are included in the annotated mask',
               required=False, requireArray=True, paramType='formData')
    .param('content_data', 'reviewer annotation content blob data to be saved on server. If reject '
                           'is False, this content_data needs to be saved',
           required=False, paramType='formData')
)
def save_user_review_result(user, item_id, done, reject, comment, approve, current_region_ids,
                            content_data):
    if comment is None:
        comment = {}
    if current_region_ids is None:
        current_region_ids = []
    return save_user_review_result_as_item(user, item_id, done, reject, comment, approve,
                                           current_region_ids, content_data)


@access.public
@autoDescribeRoute(
    Description('Get all finished annotation assignment items from a subvolume for review.')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def get_avail_items_for_review(item):
    return get_all_avail_items_for_review(item)



@access.public
@autoDescribeRoute(
    Description('Get subvolume item ids.')
    .param('training', 'A boolean True or False to indicate whether to get subvolume ids '
                       'from training data collection or not. Default is False',
           dataType='boolean', default=False, required=False)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get subvolume ids', 500)
)
def get_subvolume_ids(training):
    return get_subvolume_item_ids(training)


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
    Description('Get assignment info.')
    .modelParam('id', 'The whole subvolume item ID', model='item', level=AccessType.READ)
    .param('assign_item_id', 'assignment item ID to get assignment info for', required=False)
    .param('region_id', 'region id, e.g., 1, 2, 3, etc., to get the info of the assignment the '
                        'region belongs to', required=False)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get region info', 500)
)
def get_region_info(item, assign_item_id, region_id):
    return get_region_or_assignment_info(item, assign_item_id, region_id)


@access.public
@autoDescribeRoute(
    Description('Get region comments info.')
    .modelParam('id', 'The item ID', model='item', level=AccessType.READ)
    .param('region_label', 'region label to get comments for', required=True)
    .errorResponse()
    .errorResponse('Get action was denied on the user.', 403)
    .errorResponse('Failed to get region info', 500)
)
def get_region_comments(item, region_label):
    return get_region_comment_info(item, region_label)


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
    return get_available_region_ids(item, split_region_count)


class NinjatoPlugin(GirderPlugin):
    DISPLAY_NAME = 'Girder Ninjato API'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        # add plugin loading logic here
        getPlugin('jobs').load(info)
        # attach API route to Girder
        info['apiRoot'].user.route('GET', (':id', 'assignment'), get_user_assign_info)
        info['apiRoot'].user.route('POST', (':id', 'annotation'), save_user_annotation)

        info['apiRoot'].user.route('POST', (':id', 'review_result'), save_user_review_result)
        info['apiRoot'].user.route('POST', (':id', 'claim_assignment'),
                                   claim_region_assignment)
        info['apiRoot'].user.route('POST', (':id', 'remove_region_from_assignment'),
                                   remove_region_from_assignment)
        info['apiRoot'].user.route('POST', (':id', 'request_assignment'),
                                   request_region_assignment)
        info['apiRoot'].system.route('GET', ('subvolume_ids',), get_subvolume_ids)
        info['apiRoot'].item.route('GET', (':id', 'subvolume_info'), get_subvolume_info)
        info['apiRoot'].item.route('GET', (':id', 'new_region_ids'), get_new_region_ids)
        info['apiRoot'].item.route('GET', (':id', 'subvolume_assignment_info'), get_region_info)
        info['apiRoot'].item.route('GET', (':id', 'region_comments'), get_region_comments)
        info['apiRoot'].item.route('GET', (':id', 'available_items_for_review'),
                                   get_avail_items_for_review)
